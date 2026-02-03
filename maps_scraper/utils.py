import logging
import sys
from typing import Optional
from playwright.async_api import Locator

def setup_logger(name: str = "scraper") -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
    return logger

async def extract_text(locator: Locator, default: str = "N/A") -> str:
    """Safely extract text from a locator."""
    try:
        if await locator.count() > 0:
            text = await locator.first.inner_text()
            return text.strip() if text else default
        return default
    except Exception:
        return default
