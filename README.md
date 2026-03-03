# ECG Live Platform (v2.0)

A professional-grade medical ECG telemetry platform providing real-time cardiac monitoring, high-frequency signal analysis, and AI-assisted diagnostics. Designed for clinical environments (Puskesmas/Clinics), it supports a full medical lifecycle from patient onboarding to specialist review.

---

## Key Features

### 1. Real-time Clinical Monitoring
- **5-Lead Visualization**: Optimized charting for Lead I, II, III, aVF, and V1.
- **Live BPM Detection**: Real-time heart rate calculation performed in the backend from raw samples.
- **Network Resilience**: Integrated **Jitter Buffer** (up to 20 packets) to handle out-of-order MQTT delivery and minor latency spikes.
- **Performance Telemetry**: Real-time visualization of Latency, Jitter, and Packet Loss % per device.

### 2. AI Diagnostics & Recording
- **Seamless Segmentation**: Automated recording loops with seamless segment transitions (UUID rotation).
- **AI Arrhythmia Detection**: Integrated Keras-based ML model for automated classification (Normal, Abnormal, Arrhythmia, etc.).
- **Async Processing**: Recording data is flushed and analyzed in the background, ensuring zero-latency monitoring.

### 3. Medical Identity & Governance
- **Role-Based Workflows**: Dedicated dashboards and permissions for **Patients**, **Medical Staff (Operators)**, and **Heart Specialists (Doctors)**.
- **Onboarding Flow**: Multi-step identity verification process before accessing clinical data.
- **Admin Approval Queue**: Centralized manual verification system for clinical profiles.
- **SSE (Last Login Wins)**: Enforced Single Session per user via WebSocket session tracking for data integrity.

### 4. Advanced History & Reporting
- **Calendar Heatmaps**: Interactive data discovery through hierarchical calendar views (Year -> Day).
- **Classification Stats**: At-a-glance analytics of cardiac health trends.
- **Export Pipeline**: One-click export for **Raw Data (CSV)**, **AI Feature Data (CSV)**, and **Visual ECG Charts (PNG)**.

---

## Technical Stack

- **Backend**: FastAPI (Python 3.12+)
  - **MQTT Service**: `aiomqtt` client with high-performance jitter buffer.
  - **Signal Processing**: NumPy & SciPy for Butterworth filtering and HR detection.
  - **ML Engine**: TensorFlow/Keras for ECG classification.
  - **Database**: PostgreSQL with SQLAlchemy (optimized with composite indexes for telemetry).
- **Frontend**: Next.js 15+ (TypeScript)
  - **State**: Zustand (`useStore`) for real-time sample buffering.
  - **Charts**: Specialized Chart.js configuration for medical-grade ECG plotting.
  - **UI**: Tailwind CSS with Framer Motion for interactive medical dashboards.

---

## Prerequisites

- **Docker & Docker Compose** (Recommended for deployment)
- **Node.js 20+** (For local frontend development)
- **Python 3.12+** (For local backend development)
- **Mosquitto** (MQTT Broker)

---

## Deployment (Docker)

Deploy the complete stack (PostgreSQL, Mosquitto, Backend, Frontend):

```bash
# Clone the repository
git clone <repository-url>
cd ecg-puskesmas

# Launch services
docker-compose up --build
```

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8080`
- **API Documentation (Swagger)**: `http://localhost:8080/docs`

---

## Documentation

- [SYSTEM_FLOWS.md](SYSTEM_FLOWS.md): Detailed architectural sequence and swimlane diagrams.
- [WEBSOCKET.md](WEBSOCKET.md): Bi-directional command/event protocol for real-time monitoring.
- [MQTT.md](MQTT.md): High-frequency data ingestion and payload specifications.
- [API.md](API.md): Complete REST API documentation for Auth, Admin, and History.
- [DESIGN_DOCUMENT.md](DESIGN_DOCUMENT.md): Technical foundations and data schemas.

---

## Project Structure

```text
ecg-puskesmas/
├── backend/            # FastAPI Application
│   ├── api/            # Endpoints (v1)
│   ├── core/           # Security & DB Setup
│   ├── models/         # SQLAlchemy Schemas
│   ├── repositories/   # Data Access Layer
│   ├── services/       # MQTT, WS, ML & Storage logic
│   └── utils/          # Constants & Helpers
└── frontend/           # Next.js Application
    ├── app/            # App Router (Pages)
    ├── components/     # UI Components (Charts, Admin, User)
    ├── hooks/          # Custom Hooks (Auth, WebSocket)
    └── services/       # API & Socket Clients
```
