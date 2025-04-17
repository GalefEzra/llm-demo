FROM python:3.11.6-slim

# Update package lists and install minimal dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy backend files first
COPY backend/ ./

# Install Python dependencies with pre-built wheels
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir --only-binary :all: -r requirements.txt

# Default port
ENV PORT=8000

# Start the application
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT} 