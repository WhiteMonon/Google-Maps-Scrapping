import asyncio
import sys

# Force ProactorEventLoop on Windows for Playwright support
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import logging
import json
from typing import List, Dict, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from scraper import GoogleMapsScraper
from schemas import KeywordConfig, KeywordProgress, ScrapeStatusV2
from models import Lead
import os

# Setup logging to stream to WebSocket
log_queue = asyncio.Queue()

class QueueHandler(logging.Handler):
    def emit(self, record):
        log_entry = self.format(record)
        # We use run_coroutine_threadsafe because emit is sync
        try:
             loop = asyncio.get_running_loop()
             if loop.is_running():
                asyncio.run_coroutine_threadsafe(log_queue.put(log_entry), loop)
        except RuntimeError:
            pass # Loop not running

# Configure logger
logger = logging.getLogger("scraper")
# Remove existing handlers to avoid duplicates if reloaded
for h in logger.handlers:
    logger.removeHandler(h)

formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s', datefmt='%H:%M:%S')
queue_handler = QueueHandler()
queue_handler.setFormatter(formatter)
logger.addHandler(queue_handler)
logger.setLevel(logging.INFO)

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev convenience
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State
scraper_instance: Optional[GoogleMapsScraper] = None
scrape_task = None
is_scraping = False
scraped_leads: List[Lead] = []
KEYWORD_FILE = "keyword.json"
keyword_progress: Dict[str, KeywordProgress] = {}  # Track per-keyword progress
current_keywords_config: List[KeywordConfig] = []  # Current scrape job config

def get_keywords() -> List[KeywordConfig]:
    """Load keywords from JSON file."""
    if not os.path.exists(KEYWORD_FILE):
        # Check for legacy keyword.txt and migrate
        if os.path.exists("keyword.txt"):
            with open("keyword.txt", "r", encoding="utf-8") as f:
                lines = [k.strip() for k in f.read().splitlines() if k.strip()]
                keywords = [KeywordConfig(keyword=k, limit=50) for k in lines]
                save_keywords(keywords)  # Migrate to JSON
                return keywords
        return []
    with open(KEYWORD_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        return [KeywordConfig(**item) for item in data]

def save_keywords(keywords: List[KeywordConfig]):
    """Save keywords to JSON file."""
    with open(KEYWORD_FILE, "w", encoding="utf-8") as f:
        json.dump([k.model_dump() for k in keywords], f, indent=2, ensure_ascii=False)

def update_keyword_progress(keyword: str, status: str = None, current: int = None, error: str = None):
    """Update progress for a specific keyword."""
    global keyword_progress
    if keyword in keyword_progress:
        prog = keyword_progress[keyword]
        if status is not None:
            prog.status = status
        if current is not None:
            prog.current = current
            prog.progress = int((current / prog.limit) * 100) if prog.limit > 0 else 0
        if error is not None:
            prog.error = error

async def run_scraper_task(keywords_config: List[KeywordConfig]):
    """Run scraper for each keyword with its own limit."""
    global is_scraping, scraper_instance, keyword_progress, scraped_leads
    is_scraping = True
    scraper_instance = GoogleMapsScraper(headless=True)
    
    # Initialize progress for all keywords
    keyword_progress = {
        kc.keyword: KeywordProgress(
            keyword=kc.keyword,
            status="pending",
            current=0,
            limit=kc.limit,
            progress=0
        ) for kc in keywords_config
    }
    
    try:
        await scraper_instance.start()
        
        for kc in keywords_config:
            if not is_scraping:
                break
            
            keyword = kc.keyword
            limit = kc.limit
            
            # Update status to running
            update_keyword_progress(keyword, status="running")
            logger.info(f"Starting scrape for: {keyword} (limit: {limit})")
            
            try:
                # Pass a callback to track progress during extraction
                leads = await scraper_instance.scrape_keyword(
                    keyword, 
                    limit=limit,
                    progress_callback=lambda count: update_keyword_progress(keyword, current=count)
                )
                scraped_leads.extend(leads)
                
                # Mark as done
                update_keyword_progress(keyword, status="done", current=len(leads))
                logger.info(f"Finished {keyword}. Found {len(leads)} leads.")
                
            except Exception as e:
                update_keyword_progress(keyword, status="failed", error=str(e))
                logger.error(f"Failed {keyword}: {e}")
            
    except asyncio.CancelledError:
        logger.info("Scraping task cancelled.")
        # Mark remaining keywords as cancelled
        for kw, prog in keyword_progress.items():
            if prog.status in ["pending", "running"]:
                prog.status = "cancelled"
    except Exception as e:
        logger.error(f"Scraping error: {e}")
    finally:
        if scraper_instance:
            await scraper_instance.stop()
        is_scraping = False
        logger.info("Scraper stopped.")

@app.get("/api/keywords")
def read_keywords():
    """Get all keywords with their limits."""
    keywords = get_keywords()
    return {"keywords": [k.model_dump() for k in keywords]}

@app.get("/api/debug/screenshot")
async def get_debug_screenshot():
    file_path = "debug_feed_timeout.png"
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="Screenshot not found")

@app.post("/api/keywords")
async def update_keywords(new_keywords: List[KeywordConfig]):
    """Update keywords list."""
    save_keywords(new_keywords)
    return {"status": "updated", "count": len(new_keywords)}

@app.post("/api/start")
async def start_scraping(keywords: List[KeywordConfig] = None):
    """Start scraping with optional keyword config override."""
    global scrape_task, is_scraping, current_keywords_config, scraped_leads
    
    if is_scraping:
        return {"status": "already_running"}
    
    # Clear previous results
    scraped_leads = []
    
    # Use provided keywords or load from file
    if keywords:
        current_keywords_config = keywords
    else:
        current_keywords_config = get_keywords()
    
    if not current_keywords_config:
        raise HTTPException(status_code=400, detail="No keywords configured")
    
    scrape_task = asyncio.create_task(run_scraper_task(current_keywords_config))
    return {"status": "started", "keywords_count": len(current_keywords_config)}

@app.post("/api/stop")
async def stop_scraping():
    global is_scraping, scrape_task
    if not is_scraping:
        return {"status": "not_running"}
    
    is_scraping = False # Signal loop to break
    if scrape_task:
        scrape_task.cancel()
        try:
            await scrape_task
        except asyncio.CancelledError:
            pass
    return {"status": "stopped"}

@app.get("/api/status", response_model=ScrapeStatusV2)
def get_status():
    """Get current scraping status with per-keyword progress."""
    return ScrapeStatusV2(
        is_running=is_scraping,
        keywords=list(keyword_progress.values()),
        total_leads=len(scraped_leads)
    )

@app.post("/api/retry/{keyword}")
async def retry_keyword(keyword: str):
    """Retry a specific failed keyword."""
    global scrape_task, is_scraping, keyword_progress
    
    if is_scraping:
        raise HTTPException(status_code=400, detail="Cannot retry while scraping is running")
    
    # Find the keyword config
    keywords = get_keywords()
    keyword_config = next((kc for kc in keywords if kc.keyword == keyword), None)
    
    if not keyword_config:
        raise HTTPException(status_code=404, detail=f"Keyword not found: {keyword}")
    
    # Start scraping just this keyword
    is_scraping = True
    scrape_task = asyncio.create_task(run_scraper_task([keyword_config]))
    
    return {"status": "retry_started", "keyword": keyword}

@app.get("/api/results")
def get_results():
    return scraped_leads

@app.websocket("/ws/test")
async def websocket_test(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_text("Test connection works!")
    await websocket.close()

@app.websocket("/ws/logs")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected to /ws/logs")
    try:
        await websocket.send_text("System: WebSocket established.")
        while True:
            log = await log_queue.get()
            await websocket.send_text(log)
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")

if __name__ == "__main__":
    import uvicorn
    # Enforce loop policy again just to be safe
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    uvicorn.run("main:app", host="0.0.0.0", port=7860, reload=False)
