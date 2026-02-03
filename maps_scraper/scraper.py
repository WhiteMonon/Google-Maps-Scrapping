import asyncio
from playwright.async_api import async_playwright, Page, BrowserContext, Browser
from playwright_stealth import Stealth
from typing import List, Optional
from utils import setup_logger, extract_text
from models import Lead

class GoogleMapsScraper:
    def __init__(self, headless: bool = False):
        self.logger = setup_logger()
        self.headless = headless
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.playwright = None
        self.unique_keys = set()

    async def start(self):
        """Initialize Playwright and Browser."""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=self.headless,
            args=["--disable-blink-features=AutomationControlled"]
        )
        self.context = await self.browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        self.page = await self.context.new_page()
        stealth = Stealth()
        await stealth.apply_stealth_async(self.page)
        self.logger.info("Browser started successfully.")

    async def stop(self):
        """Close browser resource."""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        self.logger.info("Browser closed.")

    async def handle_consent(self):
        """Handle Google Consent dialog if it appears."""
        try:
            # Common selectors for consent dialog buttons
            # "Accept all", "Agree", "I agree", etc.
            consent_selectors = [
                "button[aria-label='Accept all']",
                "button:has-text('Accept all')",
                "button:has-text('I agree')",
                "form[action*='consent'] button"
            ]
            
            for selector in consent_selectors:
                if await self.page.locator(selector).count() > 0:
                    self.logger.info(f"Consent dialog found. Clicking '{selector}'...")
                    # Click and wait for navigation or disappearance
                    try:
                        await self.page.click(selector, timeout=3000)
                        await self.page.wait_for_load_state("networkidle", timeout=5000)
                        self.logger.info("Consent handle clicked.")
                        return
                    except Exception as e:
                        self.logger.warning(f"Failed to click consent: {e}")
            
            # Check for "Before you continue" iframe or specific structure
            if "consent.google.com" in self.page.url:
                 self.logger.info("Redirected to consent page. Attempting to accept...")
                 # Try keypress Enter as a fallback for accessibility focused dialogs
                 await self.page.keyboard.press("Enter")
                 await asyncio.sleep(2)

        except Exception as e:
            self.logger.warning(f"Error checking consent: {e}")

    async def search(self, keyword: str):
        """Navigate to Google Maps and search for the keyword."""
        if not self.page:
            raise Exception("Browser not started. Call start() first.")

        self.logger.info(f"Searching for: {keyword}")
        
        # Navigate to Google Maps
        await self.page.goto(f"https://www.google.com/maps/search/{keyword}")
        
        # Handle potential consent popup
        await self.handle_consent()
        
        # Wait for either the feed (list results) or a single result (direct hit)
        self.is_direct_hit = False
        try:
            # Race condition: check if we are on a list (feed) or details (main)
            # We wait for the feed primarily
            await self.page.wait_for_selector("div[role='feed']", timeout=10000)
            self.logger.info("Results feed loaded.")
        except Exception:
            # Check if it's a direct hit (single profile)
            try:
                # Look for the main profile header or 'Directions' button which implies a detail view
                if await self.page.locator("h1").count() > 0 and await self.page.locator("button[data-item-id='address']").count() > 0:
                     self.logger.info("Single result found (Direct Hit).")
                     self.is_direct_hit = True
                else:
                     raise Exception("Neither feed nor direct hit found.")
            except Exception as e:
                # Take a screenshot for debugging cloud runs
                try:
                    await self.page.screenshot(path="debug_feed_timeout.png")
                    self.logger.info("Saved debug screenshot to debug_feed_timeout.png")
                    
                    # Log page context
                    url = self.page.url
                    try:
                        title = await self.page.title()
                    except:
                        title = "Unknown"
                    
                    try:
                        # Get first 200 chars of body text to see if it's a login/consent page
                        body_text = await self.page.evaluate("document.body.innerText.substring(0, 200).replace(/\\n/g, ' ')")
                    except:
                        body_text = "Could not retrieve body"
                        
                    self.logger.info(f"debug_info: URL={url}, Title={title}, BodyStart={body_text}")
                    
                except:
                    pass
                self.logger.warning(f"Results feed not found immediately for '{keyword}'. It might be a direct hit or no results. Error: {e}")

    async def scroll_results(self, limit: int):
        """Scroll the results feed to load more items."""
        if self.is_direct_hit:
            self.logger.info("Direct hit detected. Skipping scroll.")
            return

        feed_selector = "div[role='feed']"
        try:
            # Ensure feed is loaded
            await self.page.wait_for_selector(feed_selector, timeout=10000)
            
            previous_count = 0
            stuck_count = 0  # Track how many times we're "stuck"
            max_stuck_attempts = 3  # Allow a few retries before giving up
            
            # Common selector for result cards in the feed
            card_selector = "div[role='feed'] > div > div[role='article']"
            
            while True:
                cards = self.page.locator(card_selector)
                current_count = await cards.count()
                self.logger.info(f"Loaded {current_count} items (target: {limit}).")

                if current_count >= limit:
                    self.logger.info(f"Reached limit of {limit}.")
                    break
                
                if current_count == previous_count and current_count > 0:
                    stuck_count += 1
                    self.logger.info(f"No new items loaded (attempt {stuck_count}/{max_stuck_attempts}).")
                    
                    if stuck_count >= max_stuck_attempts:
                        self.logger.info(f"Stopped scrolling - stuck at {current_count} items after {max_stuck_attempts} attempts.")
                        break
                    
                    # Try a more aggressive scroll
                    await self.page.evaluate(
                        "(selector) => { const el = document.querySelector(selector); if(el) el.scrollTop = el.scrollHeight; }", 
                        feed_selector
                    )
                    await asyncio.sleep(2)  # Wait longer for lazy loading
                    continue
                else:
                    stuck_count = 0  # Reset stuck counter when we make progress

                previous_count = current_count
                
                # Scroll to the last element to trigger load
                if current_count > 0:
                    await cards.nth(current_count - 1).scroll_into_view_if_needed()
                    
                    # Also try scrolling the feed container directly
                    await self.page.evaluate(
                        "(selector) => { const el = document.querySelector(selector); if(el) el.scrollTop = el.scrollHeight; }", 
                        feed_selector
                    )

                # Wait for new items to load (longer timeout)
                await asyncio.sleep(1.5)  # Give time for items to load

        except Exception as e:
            self.logger.error(f"Error during scrolling: {e}")

    async def extract_details(self, keyword: str, limit: int = 50, progress_callback=None) -> List[Lead]:
        """Extract details from loaded results up to the specified limit."""
        leads = []
        
        if self.is_direct_hit:
            self.logger.info("Extracting data from single page (Direct Hit)...")
            try:
                # Extract Single Page Details
                name = await extract_text(self.page.locator("h1").first)
                
                address = "N/A"
                address_btn = self.page.locator("button[data-item-id='address']")
                if await address_btn.count() > 0:
                    aria = await address_btn.get_attribute("aria-label")
                    if aria:
                        address = aria.replace("Address: ", "").strip()
                    else:
                        text = await extract_text(address_btn)
                        if text != "N/A":
                             import re
                             address = re.sub(r'^[\W_]+', '', text).strip()
                
                phone = "N/A"
                phone_btn = self.page.locator("button[data-item-id^='phone']")
                if await phone_btn.count() > 0:
                     aria = await phone_btn.get_attribute("aria-label")
                     if aria:
                         phone = aria.replace("Phone: ", "").strip()
                     else:
                         text = await extract_text(phone_btn)
                         if text != "N/A":
                             import re
                             phone = re.sub(r'^[\W_]+', '', text).strip()

                website = "N/A"
                website_locator = self.page.locator("a[data-item-id='authority']")
                if await website_locator.count() > 0:
                     website = await website_locator.get_attribute("href") or "N/A"
                
                lead = Lead(
                    name=name,
                    address=address,
                    website=website,
                    phone=phone,
                    keyword=keyword
                )
                leads.append(lead)
                self.logger.info(f"Extracted Direct Hit: {name}")
                return leads

            except Exception as e:
                self.logger.error(f"Error extracting direct hit: {e}")
                return []

        # Normal List Extraction logic
        card_selector = "div[role='feed'] > div > div[role='article']"
        cards = self.page.locator(card_selector)
        count = await cards.count()
        # Limit extraction to the requested amount
        target_count = min(count, limit)
        self.logger.info(f"Starting extraction for {target_count} of {count} loaded items (limit: {limit})...")
        
        last_address = None

        for i in range(target_count):
            try:
                # Re-query the card to avoid stale element errors
                card = cards.nth(i)
                
                # Deduplication using URL (most robust)
                url = ""
                # Try to find the main link in the card
                link_locator = card.locator("a").first
                if await link_locator.count() > 0:
                    url = await link_locator.get_attribute("href") or ""
                
                # Fallback to name if URL not found
                name = await card.get_attribute("aria-label")
                if not name:
                     name = await extract_text(card.locator(".fontHeadlineSmall").first, default="N/A")

                # Deduplication Logic
                # Prefer URL as key, fall back to name if URL missing
                unique_key = url if url else name
                
                if unique_key in self.unique_keys:
                    self.logger.info(f"Duplicate found (key={unique_key[:30]}...), skipping.")
                    continue
                
                # Add to set tentatively (will confirm after validity)
                # We add it here to prevent re-processing even if extraction fails later
                self.unique_keys.add(unique_key)
                
                if name == "N/A" and not url:
                    self.logger.warning(f"Skipping item {i}: No name or URL found.")
                    continue

                # Optimization: Try to get data from card first without clicking?
                # Usually Google maps cards only show name, rating, and maybe address snippet.
                # Phone and Website often require clicking.
                
                # Check if we can skip clicking (Not usually possible for full data, but we can do a faster check)
                
                # Scroll to card
                await card.scroll_into_view_if_needed()
                
                # Fast Click
                await card.click(force=True)

                # Wait for detail panel - Optimized
                # We relax the strict matching slightly to speed up, using a faster polling interval
                # And we rely on the fact that if we click, the UI handles it fairly quickly.
                
                # 1. Wait for detail container (fast check)
                try:
                    await self.page.wait_for_selector("div[role='main']", timeout=2000)
                except:
                    pass

                # 2. Fast Stale Check (Max 2 seconds instead of 5)
                # We check if the H1 matches OR if the address/phone buttons have changed
                matched = False
                for _ in range(5): # 5 * 0.2 = 1 sec wait max for matching
                    detail_h1 = self.page.locator("div[role='main'] h1")
                    if await detail_h1.count() > 0:
                        h1_text = await extract_text(detail_h1)
                        if h1_text and (h1_text in name or name in h1_text):
                            matched = True
                            break
                    await asyncio.sleep(0.2)
                
                # Even if not perfectly matched, we proceed if we have valid buttons, to save time.
                # The strict check was "very slow", so we trade a tiny bit of safety for speed.
                
                # Parallel extraction of fields to save time
                # We create locators first
                address_locator = self.page.locator("button[data-item-id='address']")
                phone_locator = self.page.locator("button[data-item-id^='phone']")
                website_locator = self.page.locator("a[data-item-id='authority']")
                website_alt = self.page.locator("a[aria-label^='Website']")

                # Gather all text promises at once
                # Note: This is slightly risky if elements aren't attached, but with Playwright auto-wait it's usually fine.
                # However, for robustness + speed, we just execute them sequentially but with small timeouts                # Address
                # Priority: Aria-label (cleaner) > Text (might have icons)
                # Check against previous item to prevent stale data
                address = "N/A"
                for attempt in range(3): # Retry up to 3 times if address matches previous
                    address_btn = self.page.locator("button[data-item-id='address']")
                    if await address_btn.count() > 0:
                        aria = await address_btn.get_attribute("aria-label")
                        if aria:
                             address = aria.replace("Address: ", "").strip()
                        else:
                            text = await extract_text(address_btn)
                            if text != "N/A":
                                 import re
                                 address = re.sub(r'^[\W_]+', '', text).strip()
                    
                    # If this address is the same as the last one, try to refresh details
                    if last_address and address == last_address and address != "N/A":
                        self.logger.warning(f"Address stale (Attempt {attempt+1}). Re-clicking card...")
                        # Re-click to force update ("reload" detail view context)
                        await card.click(force=True)
                        await asyncio.sleep(1.5)
                        # Reset address to ensure we don't carry over if extraction fails next loop
                        # address = "N/A" # Keep current for comparison, but re-extract next loop
                        continue
                    else:
                        break # Address is new or N/A, proceed
                
                # Final check: If still stale after retries, skip this item
                if last_address and address == last_address and address != "N/A":
                    self.logger.warning(f"Skipping item {i}: Persistent stale address '{address}'")
                    continue

                last_address = address

                # Phone
                phone = "N/A"
                if await phone_locator.count() > 0:
                    aria = await phone_locator.get_attribute("aria-label")
                    if aria:
                        phone = aria.replace("Phone: ", "").strip()
                    else:
                        text = await extract_text(phone_locator)
                        if text != "N/A":
                            import re
                            phone = re.sub(r'^[\W_]+', '', text).strip()

                # Website
                website = "N/A"
                if await website_locator.count() > 0:
                     website = await website_locator.get_attribute("href") or "N/A"
                elif await website_alt.count() > 0:
                     website = await website_alt.get_attribute("href") or "N/A"

                lead = Lead(
                    name=name,
                    address=address,
                    website=website,
                    phone=phone,
                    keyword=keyword
                )
                leads.append(lead)
                self.logger.info(f"Extracted ({len(leads)}/{target_count}): {name}")
                
                # Call progress callback if provided
                if progress_callback:
                    try:
                        progress_callback(len(leads))
                    except:
                        pass
                
                # Stop if we've reached the limit
                if len(leads) >= limit:
                    self.logger.info(f"Reached extraction limit of {limit}.")
                    break
                
            except Exception as e:
                self.logger.error(f"Error extracting item {i}: {e}")
                continue
        
        return leads

    async def scrape_keyword(self, keyword: str, limit: int = 50, progress_callback=None) -> List[Lead]:
        """Main method to handle a single keyword."""
        await self.search(keyword)
        await self.scroll_results(limit)
        
        leads = await self.extract_details(keyword, limit=limit, progress_callback=progress_callback)
        return leads


