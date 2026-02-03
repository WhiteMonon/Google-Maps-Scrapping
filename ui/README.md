# G-Maps Scraper Dashboard

A modern, responsive React application for controlling the Google Maps Scraper backend. Built with Vite, TypeScript, and Tailwind CSS.

## Features

- **Control Panel**: Start/Stop scraping and view global status.
- **Keyword Manager**: 
  - Add/Remove keywords.
  - Set individual result limits per keyword.
  - Save configuration to the backend.
- **Live Progress**: 
  - Visual progress bars for each keyword.
  - Status indicators (Pending, Running, Done, Failed).
  - "Retry" button for individual failed tasks.
- **Results Table**: 
  - View extracted leads (Name, Phone, Website, Address).
  - Export data to CSV.
- **Log Viewer**: Live terminal-style log output from the backend.

## Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **State Management**: React Hooks

## Connection

The dashboard expects the backend to be running on `http://localhost:8001`. Ensure the `maps_scraper` service is active before using the UI.
