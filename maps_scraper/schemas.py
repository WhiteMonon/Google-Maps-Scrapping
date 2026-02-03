from pydantic import BaseModel
from typing import List, Optional
from models import Lead

class KeywordUpdate(BaseModel):
    keywords: str  # Legacy: raw text content of keyword.txt

class KeywordConfig(BaseModel):
    keyword: str
    limit: int = 50  # Default limit

class KeywordProgress(BaseModel):
    keyword: str
    status: str  # "pending" | "running" | "done" | "failed"
    current: int = 0
    limit: int
    progress: int = 0  # Percentage 0-100
    error: Optional[str] = None

class ScrapeStatus(BaseModel):
    is_running: bool
    current_keyword: Optional[str] = None
    total_leads: int = 0

class ScrapeStatusV2(BaseModel):
    is_running: bool
    keywords: List[KeywordProgress] = []
    total_leads: int = 0
