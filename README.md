# ECG Live Platform

Real-time ECG monitoring and analysis system with ML classification.

## Project Structure

- **backend/**: FastAPI application (API, WebSocket, ML Inference).
  - Contains `Dockerfile`, `.env` (moved from root).
- **frontend/**: Next.js application (UI/UX, Real-time Charts).
  - Contains `Dockerfile`.
- **mosquitto/**: MQTT Broker configuration.

## Prerequisites

- Docker & Docker Compose

## Quick Start (Docker)

The easiest way to run the entire stack (PostgreSQL, Mosquitto, Backend, Frontend):

```bash
# Clone the repository
git clone <repository-url>
cd ecg-puskesmas

# Start the application
docker-compose up --build
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **API Documentation**: [http://localhost:5000/docs](http://localhost:5000/docs)

## Local Development Setup

If you prefer to run services manually without Docker:

### 1. Backend (from project root)

```bash
# Activate venv
# Windows
.\backend\venv\Scripts\activate
# Linux/macOS
source backend/venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run module
python main.py
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Configuration is handled via `.env` in the `backend/` directory for the server, and through `docker-compose.yml` build arguments for the frontend.

### Frontend (Baked into build)
- `NEXT_PUBLIC_API_URL`: Backend API URL (default: `http://localhost:5000/api/v1`)
- `NEXT_PUBLIC_WS_URL`: Backend WebSocket URL (default: `ws://localhost:5000/ws`)

### Backend
See `backend/.env-example` for available configuration.