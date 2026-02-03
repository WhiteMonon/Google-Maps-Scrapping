# Use the official Playwright + Python image
# This includes Python, Playwright, and necessary browser dependencies
FROM mcr.microsoft.com/playwright/python:v1.49.0-jammy

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Chromium (and its system dependencies if needed)
# The base image usually has dependencies, but we need to ensure the specific browser is installed
RUN playwright install chromium

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 7860

# Command to run the application
# We use python main.py because the main.py invokes uvicorn in a way that handles the asyncio loop policy for Playwright compatibility
CMD ["python", "main.py"]
