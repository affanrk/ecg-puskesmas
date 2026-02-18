# ECG Live Platform

A professional medical ECG telemetry platform providing real-time monitoring, high-frequency signal analysis, and AI-assisted cardiac diagnostics.

## 🚀 Key Features

- **Real-time Telemetry**: High-frequency ECG signal streaming via MQTT and WebSockets.
- **AI Diagnostics**: Automated arrhythmia detection using an integrated ML model.
- **Modern UI/UX**: Clean, professional interface with specialized cardiac visualization (Lead I, II, V1).
- **Advanced Security**: 
  - **Last Login Wins**: Enforced single-active session per user for data integrity.
  - **Traceable Activity**: Unique `X-Request-ID` assigned to every request for precise audit trailing.
  - **Business Identity**: Sequential medical IDs (USR/PAT/APP) for professional record tracking.
  - **User/Patient Separation**: Dedicated tables for authentication and clinical profile data.
- **System Telemetry**: Real-time monitoring of network health, latency, and system performance.
- **Enhanced Observability**: Professional-grade logging with clean separation between operational milestones (INFO) and technical details (DEBUG).
- **Admin Console**: Centralized approval queue for new medical profiles.

## 🏗️ Architecture

- **Backend**: FastAPI (Python 3.12+)
  - **Repositories**: Standardized data access layer with Reader/Writer separation.
  - **Data Routing**: Dual-table architecture for raw data (`tb_r_ecg_raw_web` vs `tb_r_ecg_raw_mobile`) ensuring clean platform separation.
  - **Models**: SQLAlchemy with TSID/UUID primary keys and composite indexes for high-performance telemetry.
  - **Messaging**: Mosquitto (MQTT) for signal ingestion and WebSockets for real-time UI updates.
- **Frontend**: Next.js 15+ (TypeScript)
  - **State Management**: Zustand for efficient real-time data handling.
  - **Visualization**: Optimized Canvas-based ECG charting.
  - **Services**: Centralized Axios instance with automated session enforcement interceptors.

## 🛠️ Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.12+ (for local backend development)

## 🚦 Quick Start (Docker)

The fastest way to deploy the complete stack (PostgreSQL, Mosquitto, Backend, Frontend):

```bash
# Clone the repository
git clone <repository-url>
cd ecg-puskesmas

# Start the application
docker-compose up --build
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8080](http://localhost:8080)
- **API Docs**: [http://localhost:8080/docs](http://localhost:8080/docs)

## 💻 Local Development

### Backend Setup

```bash
cd backend
# Create and activate venv
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate # Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Run application
python main.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 📄 Documentation

- [MQTT Protocol](MQTT.md): Data pipe and payload specifications.
- [WebSocket API](WEBSOCKET_API.md): Real-time command and event documentation.
- [Design Document](DESIGN_DOCUMENT.md): System architecture and data flow.
- [System Flows](SYSTEM_FLOWS.md): Detailed sequence diagrams for core processes.

## 🔐 Environment Variables

### Frontend
- `NEXT_PUBLIC_API_URL`: Backend API URL (default: `http://localhost:8080/api/v1`)
- `NEXT_PUBLIC_WS_URL`: Backend WebSocket URL (default: `ws://localhost:8080/ws`)

### Backend
Configured via `backend/.env`. Refer to `backend/.env-example` for the full list of required keys (Database, MQTT, Security).
