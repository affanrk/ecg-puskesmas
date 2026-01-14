FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
# We are in context of ./backend, so requirements.txt is at the root of the context
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
# We copy everything in the context (./backend/*) to /app/backend
# so that "import backend..." works correctly
COPY . /app/backend

# Ensure /app is in python path so 'backend' is a valid package
ENV PYTHONPATH=/app

# Run from /app so it finds the backend package
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "5000"]