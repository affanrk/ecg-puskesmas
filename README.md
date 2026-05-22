# ECG Live Platform (v2.0)

A professional-grade medical ECG telemetry platform providing real-time cardiac monitoring, high-frequency signal analysis, and AI-assisted diagnostics. Designed for clinical environments (Puskesmas/Clinics), it supports a full medical lifecycle from patient onboarding to specialist review.

---

## Key Features

### 1. Real-time Clinical Monitoring
- **12-Lead & 5-Lead Support**: Comprehensive 12-lead ECG capabilities alongside standard 5-lead optimized charting.
- **Live BPM Detection**: Real-time heart rate calculation performed in the backend from raw samples.
- **Network Resilience**: Integrated **Jitter Buffer** (up to 20 packets) to handle out-of-order MQTT delivery and minor latency spikes.
- **Performance Telemetry**: Real-time visualization of Latency, Jitter, and Packet Loss % per device.

### 2. AI Diagnostics & Recording
- **Seamless Segmentation**: Automated recording loops with seamless segment transitions (UUID rotation).
- **AI Arrhythmia Detection**: Integrated Keras-based ML model for automated classification (Normal, Abnormal, Arrhythmia, etc.).
- **Async Processing**: Recording data is flushed and analyzed in the background, ensuring zero-latency monitoring.

### 3. Medical Identity & Governance
- **Role-Based Workflows**: Dedicated dashboards and permissions for **Patients**, **Medical Staff (Operators)**, and **Heart Specialists (Doctors)**.
- **Walk-in Patient Management**: Dedicated workflow for operators to serve unregistered walk-in patients.
- **Multi-Location Staff**: Ability for medical staff to be assigned to and operate across multiple clinics.
- **Session Registry**: Full JWT tracking (Last Login Wins) and audit logs for all security events.
- **Onboarding Flow**: Multi-step identity verification process before accessing clinical data.
- **Admin Approval Queue**: Centralized manual verification system for clinical profiles.

### 4. Advanced History & Reporting
- **Calendar Heatmaps**: Interactive data discovery through hierarchical calendar views (Year -> Day).
- **Classification Stats**: At-a-glance analytics of cardiac health trends.
- **Export Pipeline**: One-click export for **Raw Data (CSV)**, **AI Feature Data (CSV)**, and **Visual ECG Charts (PNG)**.

---

## Technical Stack

- **Backend**: FastAPI (Python 3.12+)
  - **Security**: `argon2` for secure password hashing.
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
│   ├── jobs/           # Background scheduled tasks
│   ├── ml_models/      # Keras model files
│   ├── models/         # SQLAlchemy Schemas
│   ├── repositories/   # Data Access Layer
│   ├── services/       # MQTT, WS, ML & Storage logic
│   └── utils/          # Constants
└── frontend/           # Next.js Application
    ├── app/            # App Router (Pages)
    ├── components/     # UI Components (Charts, Admin, User)
    ├── config/         # Frontend configuration
    ├── data/           # Static data assets
    ├── hooks/          # Custom Hooks (Auth, WebSocket)
    └── services/       # API & Socket Clients
```

## Quickstart (Local Development)

### Backend (Python)

Prereqs: Python 3.12+, virtualenv.

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate   # Windows
source .venv/bin/activate    # macOS / Linux
pip install -r requirements.txt
# Run dev server
python -m main
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

## Runtime Notes / Breaking Changes

- Login behavior: `/api/v1/auth/login` returns `404 Not Found` when the username/email is not present; a `401 Unauthorized` is returned for incorrect password. Clients should treat `404` as "user not found" and prompt registration or recovery.
- `must_reset_password`: Present on the `UserResponse` schema. When `true`, clients must prompt the user to change password before proceeding. Successful `change-password` requests clear the server-side flag.
- Walk-in patients: `tb_m_patient.user_id` is nullable to support walk-ins. When converting a walk-in to a registered user, a password may be generated and `must_reset_password` set for the new account. Operator/created_by mapping is preserved on conversion.

## Operational Notes: Raw Data Storage

- Raw sample tables: `tb_r_ecg_raw_5leads_web`, `tb_r_ecg_raw_5leads_mobile`, `tb_r_ecg_raw_12leads_web`, `tb_r_ecg_raw_12leads_mobile`.
- Recommended composite index for efficient sequential reads:

```sql
CREATE INDEX idx_raw_5leads_web_recording_dt ON tb_r_ecg_raw_5leads_web (recording_id, created_dt);
-- Repeat for mobile/12-lead tables
```

```
