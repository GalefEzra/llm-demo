FROM python:3.11-slim

# Update package lists
RUN apt-get update

# Install system dependencies
RUN apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Rust with retry mechanism
RUN for i in 1 2 3; do \
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y && break || sleep 15; \
    done
ENV PATH="/root/.cargo/bin:${PATH}"

# Set working directory
WORKDIR /app/backend

# Copy and install Python dependencies with retry mechanism
COPY backend/requirements.txt ./requirements.txt
RUN for i in 1 2 3; do \
    pip install --no-cache-dir -r requirements.txt && break || sleep 15; \
    done

# Copy backend files
COPY backend/ ./

# Expose port
EXPOSE 8000

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 