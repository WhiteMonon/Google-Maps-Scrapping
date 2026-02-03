# Google Maps Scraper Project

A comprehensive tool for scraping business leads from Google Maps, featuring a robust Python backend and a modern React dashboard.

## Project Structure

- **`maps_scraper/`**: Python/FastAPI backend that handles the scraping logic using Playwright.
- **`ui/`**: React/TypeScript frontend for managing keywords, monitoring progress, and viewing results.

## Prerequisites

- **Python**: 3.8+
- **Node.js**: 16+
- **Playwright**: Browser binaries

## Quick Start

### 1. Backend Setup (`maps_scraper`)

```bash
cd maps_scraper
# Create virtual environment (optional but recommended)
python -m venv venv
# Activate venv:
# Windows: .\venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Start the server
python main.py
```

The server will run on `http://127.0.0.1:8001`.

### 2. Frontend Setup (`ui`)

```bash
cd ui
# Install dependencies
npm install

# Start the development server
npm run dev
```

The dashboard will be available at `http://localhost:5173`.

## Features

- **Keyword Management**: Add, remove, and configure limits for search keywords.
- **Real-time Monitoring**: Watch scraping progress, extraction counts, and status updates live.
- **Data Extraction**: Collects Name, Address, Phone, Website, and more.
- **Export**: Download collected leads as CSV.
- **Concurrency**: Handles multiple keywords with individual progress tracking.
- **Robustness**: Includes retry logic for stuck scrolls and network checks.
