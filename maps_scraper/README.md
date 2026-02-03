---
title: Maps Scrapping
emoji: 📍
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
---

Check out the configuration reference at https://huggingface.co/docs/hub/spaces-config-reference


# Google Maps Scraper Backend

A FastAPI-based backend that uses Playwright (`scraper.py`) to scrape business information from Google Maps.

## Capabilities

- **Automated Browsing**: Uses Playwright with stealth plugins to navigate Google Maps.
- **Resilient Scrolling**: Smart scrolling logic to ensure all results are loaded, with retry mechanisms for stuck feeds.
- **Accurate Extraction**: Extracts Name, Address, Phone, Website, and deduplicates based on URL/Name.
- **Real-time Feedback**: Streams logs and progress updates via WebSocket.
- **Control API**: Endpoints to start, stop, retry, and manage keywords.

## Installation

```bash
pip install -r requirements.txt
playwright install chromium
```

## Running the Server

```bash
python main.py
```

The server listens on `http://127.0.0.1:8001`.

## API Endpoints

### Core
- `POST /api/start`: Start the scraping process.
- `POST /api/stop`: Stop the current scraping job.
- `GET /api/status`: Get current status (running/idle) and keyword progress.

### Data & Config
- `GET /api/keywords`: List all configured keywords.
- `POST /api/keywords`: Update the keyword list.
- `GET /api/results`: Get all scraped leads.
- `POST /api/retry/{keyword}`: Retry a specific failed keyword.

### WebSockets
- `/ws/logs`: Real-time log streaming.

## Configuration

Keywords are stored in `keyword.json`. Each entry supports:
- `keyword`: The search term (e.g., "restaurants in New York").
- `limit`: Maximum number of results to extract (default: 50).

## Troubleshooting

- **"Browser not started"**: Ensure you call the start endpoint/button.
- **Stuck Scrolling**: The scraper performs up to 3 aggressive retry attempts if no new items load.
- **Playwright Errors**: Ensure chromium is installed (`playwright install chromium`).