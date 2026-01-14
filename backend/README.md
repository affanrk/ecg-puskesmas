# ECG Live Platform - Backend

FastAPI application for real-time ECG monitoring, ML analysis, and data management.

## Project Structure

- `api/v1/`: API endpoints (Auth, History, Export, Health, WebSocket).
- `core/`: Core configuration, database setup, and security.
- `ml_models/`: Trained ML models and scalers.
- `models/`: SQLAlchemy database models.
- `repositories/`: Data access layer (CRUD operations).
- `schemas/`: Pydantic models for validation and serialization.
- `services/`: Business logic (MQTT, ML Engine, Signal Processing).
- `utils/`: Constants and helper functions.
- `helper/`: Standalone scripts for simulation and reporting.

## Getting Started

### Prerequisites

- Python 3.10+
- PostgreSQL
- Mosquitto (MQTT Broker)

### Local Setup

1. **Install dependencies:**
   ```bash
   python -m venv venv
   # Windows
   .\venv\Scripts\activate
   # Linux/macOS
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```

2. **Configuration:**
   Create a `.env` file from `.env-example` and fill in your credentials:
   ```bash
   cp .env-example .env
   ```
   *Make sure to set a strong `SECRET_KEY`.*

3. **Run the application:**
   ```bash
   # From the project root directory
   python -m backend.main
   ```

## API Documentation

Once the server is running, documentation is available at:
- **Swagger UI**: [http://localhost:5000/docs](http://localhost:5000/docs)
- **ReDoc**: [http://localhost:5000/redoc](http://localhost:5000/redoc)

## Core Features

- **Real-time Streaming**: WebSocket and MQTT integration for sub-second latency.
- **AI Analysis**: Automated ECG classification using ANN models.
- **Signal Processing**: Real-time DSP filtering (Lowpass, Highpass, Notch).
- **Data Export**: Professional ECG charts (PNG) and raw data (CSV) generation.
- **Monitoring**: Comprehensive system health and device performance tracking.
