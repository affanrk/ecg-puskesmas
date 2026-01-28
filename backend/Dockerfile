FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . /app

# Ensure /app is in python path so 'backend' is a valid package
ENV PYTHONPATH=/app

# Run from /app so it finds the backend package
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${FLASK_PORT:-8080}"]