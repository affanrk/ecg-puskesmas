# ECG Monitoring System - Scale Up Design Document

## 1. System Architecture (Hybrid Microservices)

This architecture is designed for National Scale implementation, separating concerns between Real-time Handling, Business Logic, and Heavy AI Processing.

```mermaid
graph TD
    subgraph "Clients"
        WEB[Web Dashboard<br/>Next.js]
        IOT[ECG Devices<br/>IoT/MQTT]
    end

    subgraph "Core Backend (FastAPI)"
        API[API Gateway<br/>Auth, Users, History]
        WS[WebSocket Gateway<br/>Real-time Streaming]
        INGEST[Data Ingestion Service]
    end

    subgraph "AI Microservice (Python)"
        WORKER[AI Worker<br/>FastAPI/Celery]
        MODEL[TensorFlow Model]
        FE[Feature Extractor<br/>NumPy/SciPy]
    end

    subgraph "Data Storage"
        REDIS[(Redis<br/>Hot Data / Queue)]
        PGSQL[(PostgreSQL<br/>Master Data)]
        TSDB[(TimescaleDB<br/>Signal Data)]
    end

    IOT -->|MQTT/WS| WS
    WEB -->|HTTP/WS| API
    
    WS --> INGEST
    INGEST -->|1. Buffer| REDIS
    INGEST -->|2. Batch Insert| TSDB
    
    INGEST -->|3. Analysis Job| REDIS
    REDIS -->|Pop Job| WORKER
    WORKER --> FE
    FE --> MODEL
    WORKER -->|Result| API
    API -->|Save Result| PGSQL
    API -->|Notify| WS
    WS -->|Update UI| WEB
```

---

## 2. Database Design (ERD)

Using `TB_M_` (Master), `TB_R_` (Transaction), and `TB_T_` (Temporary/Queue) conventions.

```mermaid
erDiagram
    %% Master Tables
    TB_M_FACILITIES ||--|{ TB_M_DEVICES : owns
    TB_M_FACILITIES ||--|{ TB_R_SESSIONS : location
    
    TB_M_USERS ||--|{ TB_R_SESSIONS : records_own_data
    
    TB_M_DEVICES ||--|{ TB_R_SESSIONS : used_in
    
    %% Transaction Tables
    TB_R_SESSIONS ||--|{ TB_R_AI_RESULTS : has_analysis
    TB_R_SESSIONS ||--|{ TB_R_SIGNAL_DATA : has_raw_data
    
    %% Temporary Tables
    TB_M_DEVICES ||--|{ TB_T_RAW_BUFFER : streams_to
```

---

## 3. Database Schema (PostgreSQL DDL)

### 3.1. Master Tables (`TB_M_`)

```sql
-- Facilities (Puskesmas / RS)
CREATE TABLE tb_m_facilities (
    id              CHAR(26) PRIMARY KEY,       -- TSID
    facility_code   VARCHAR(20) UNIQUE NOT NULL,-- Business Key (ex: PKM-SBY-001)
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(20) NOT NULL,       -- PUSKESMAS, RSUD, KLINIK
    address         TEXT,
    
    -- Audit Trail
    created_by      CHAR(26) NOT NULL,
    created_dt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by      CHAR(26),
    changed_dt      TIMESTAMP
);

-- Users (Central Identity & Authentication)
CREATE TABLE tb_m_user (
    id              VARCHAR(30) PRIMARY KEY,    -- USR20260213000001
    username        VARCHAR(50) UNIQUE NOT NULL,
    email           VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role            VARCHAR(20) DEFAULT 'user', -- user, operator, doctor, admin
    is_active       INTEGER DEFAULT 1,          -- 1: Active, 0: Inactive
    is_activated    INTEGER DEFAULT 0,          -- 1: Approved, 0: Pending/Rejected
    is_patient      BOOLEAN DEFAULT FALSE,
    is_operator     BOOLEAN DEFAULT FALSE,
    is_doctor       BOOLEAN DEFAULT FALSE,
    current_session_id VARCHAR(100),            -- For "Last Login Wins"
    last_login_dt   TIMESTAMP,
    last_login_source VARCHAR(50),              -- WEB, MOBILE
    
    created_by      VARCHAR(50) DEFAULT 'SYSTEM',
    created_dt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by      VARCHAR(50),
    changed_dt      TIMESTAMP
);

-- Patients (Clinical Profiles)
CREATE TABLE tb_m_patient (
    id              VARCHAR(30) PRIMARY KEY,    -- PAT20260213000001
    user_id         VARCHAR(30) UNIQUE NOT NULL REFERENCES tb_m_user(id) ON DELETE CASCADE,
    
    nik             VARCHAR(20) UNIQUE,
    full_name       VARCHAR(100),
    pob             VARCHAR(100),               -- Place of Birth
    dob             DATE,
    gender          VARCHAR(20),
    address         TEXT,
    contact_number  VARCHAR(20),
    medical_history TEXT,
    status          VARCHAR(20) DEFAULT 'QUEUE',-- QUEUE, APPROVED, REJECTED
    
    created_by      VARCHAR(50) DEFAULT 'SYSTEM',
    created_dt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by      VARCHAR(50),
    changed_dt      TIMESTAMP
);

-- Operators (Nurses / GP)
CREATE TABLE tb_m_operator (
    id              VARCHAR(30) PRIMARY KEY,    -- OPR...
    user_id         VARCHAR(30) UNIQUE NOT NULL REFERENCES tb_m_user(id) ON DELETE CASCADE,
    
    nik             VARCHAR(20) UNIQUE,
    full_name       VARCHAR(100) NOT NULL,
    pob             VARCHAR(100) NOT NULL,
    dob             DATE NOT NULL,
    gender          VARCHAR(10) NOT NULL,
    address         VARCHAR(255),
    contact_number  VARCHAR(20),
    str_number      VARCHAR(50) NOT NULL,       -- Surat Tanda Registrasi
    operator_role   VARCHAR(50) NOT NULL,
    work_location   VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'QUEUE',
    
    created_by      VARCHAR(50) DEFAULT 'SYSTEM',
    created_dt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by      VARCHAR(50),
    changed_dt      TIMESTAMP
);

-- Doctors (Specialists)
CREATE TABLE tb_m_doctor (
    id              VARCHAR(30) PRIMARY KEY,    -- DOC...
    user_id         VARCHAR(30) UNIQUE NOT NULL REFERENCES tb_m_user(id) ON DELETE CASCADE,
    
    nik             VARCHAR(20) UNIQUE,
    full_name       VARCHAR(100) NOT NULL,
    pob             VARCHAR(100) NOT NULL,
    dob             DATE NOT NULL,
    gender          VARCHAR(10) NOT NULL,
    address         VARCHAR(255),
    contact_number  VARCHAR(20),
    str_number      VARCHAR(50) NOT NULL,
    sip_number      VARCHAR(50) NOT NULL,       -- Surat Izin Praktik
    specialty       VARCHAR(100) NOT NULL,
    work_location   VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'QUEUE',
    
    created_by      VARCHAR(50) DEFAULT 'SYSTEM',
    created_dt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by      VARCHAR(50),
    changed_dt      TIMESTAMP
);

-- Administrators
CREATE TABLE tb_m_admin (
    id              VARCHAR(30) PRIMARY KEY,    -- ADM...
    user_id         VARCHAR(30) UNIQUE NOT NULL REFERENCES tb_m_user(id) ON DELETE CASCADE,
    
    nik             VARCHAR(20) UNIQUE,
    full_name       VARCHAR(100) NOT NULL,
    pob             VARCHAR(100) NOT NULL,
    dob             DATE NOT NULL,
    gender          VARCHAR(10) NOT NULL,
    address         VARCHAR(255) NOT NULL,
    contact_number  VARCHAR(20) NOT NULL,
    status          VARCHAR(20) DEFAULT 'QUEUE',
    
    created_by      VARCHAR(50) DEFAULT 'SYSTEM',
    created_dt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by      VARCHAR(50),
    changed_dt      TIMESTAMP
);

-- Devices (IoT Hardware)
CREATE TABLE tb_m_devices (
    id              CHAR(26) PRIMARY KEY,
    serial_number   VARCHAR(50) UNIQUE NOT NULL,
    name            VARCHAR(50),
    facility_id     CHAR(26) REFERENCES tb_m_facilities(id),
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    
    created_by      CHAR(26) NOT NULL,
    created_dt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by      CHAR(26),
    changed_dt      TIMESTAMP
);
```

### 3.2. Transaction Tables (`TB_R_`)

```sql
-- Profile Approval Logs
CREATE TABLE tb_r_log_approval (
    id              VARCHAR(30) PRIMARY KEY,    -- APP...
    user_id         VARCHAR(30) NOT NULL REFERENCES tb_m_user(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL,       -- QUEUE, APPROVED, REJECTED
    reason          VARCHAR(100),               -- Reason notes
    
    created_by      VARCHAR(50) DEFAULT 'SYSTEM',
    created_dt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions (Recording Sessions)
CREATE TABLE tb_r_ecg_session (
    recording_id    VARCHAR(50) PRIMARY KEY,    -- UUID
    device_id       VARCHAR(50) NOT NULL,
    user_id         VARCHAR(30) NOT NULL REFERENCES tb_m_user(id),
    subject_id      VARCHAR(20),                -- NIK of the patient
    
    classification_result VARCHAR(50) DEFAULT 'Pending',
    confidence_score FLOAT,
    
    avg_bpm         FLOAT,
    avg_rr_ms       FLOAT,
    avg_pr_ms       FLOAT,
    avg_qs_ms       FLOAT,
    avg_qtc_ms      FLOAT,
    avg_st_ms       FLOAT,
    rs_ratio_v1     FLOAT,
    
    -- Audit Trail
    created_by      VARCHAR(50) NOT NULL,
    created_dt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by      VARCHAR(50),
    changed_dt      TIMESTAMP
);

-- Signal Data (Web/Desktop)
CREATE TABLE tb_r_ecg_raw_web (
    id              BIGSERIAL PRIMARY KEY,
    recording_id    VARCHAR(50) NOT NULL REFERENCES tb_r_ecg_session(recording_id) ON DELETE CASCADE,
    
    mv_lead_I       FLOAT,
    mv_lead_II      FLOAT,
    mv_lead_III     FLOAT,
    mv_avF          FLOAT,
    mv_v1           FLOAT,
    
    raw_lead_I      INTEGER,
    raw_lead_II     INTEGER,
    raw_v1          INTEGER,
    
    created_by      VARCHAR(50) DEFAULT 'DEVICE',
    created_dt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Signal Data (Mobile)
CREATE TABLE tb_r_ecg_raw_mobile (
    id              BIGSERIAL PRIMARY KEY,
    recording_id    VARCHAR(50) NOT NULL REFERENCES tb_r_ecg_session(recording_id) ON DELETE CASCADE,
    
    mv_lead_I       FLOAT,
    mv_lead_II      FLOAT,
    mv_lead_III     FLOAT,
    mv_avF          FLOAT,
    mv_v1           FLOAT,
    
    raw_lead_I      INTEGER,
    raw_lead_II     INTEGER,
    raw_v1          INTEGER,
    
    created_by      VARCHAR(50) DEFAULT 'MOBILE',
    created_dt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Network & Device Performance Logs
CREATE TABLE tb_r_performance_log (
    id              BIGSERIAL PRIMARY KEY,
    device_id       VARCHAR(50) NOT NULL,
    recording_id    VARCHAR(50),
    
    latency_ms      FLOAT,
    jitter_ms       FLOAT,
    packet_loss_pct FLOAT,
    packet_counter  BIGINT,
    
    created_by      VARCHAR(50) DEFAULT 'SYSTEM',
    created_dt      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by      VARCHAR(50),
    changed_dt      TIMESTAMP
);
```

### 3.3. Temporary Tables (`TB_T_`)

```sql
-- Raw Ingestion Buffer (High Speed)
CREATE TABLE tb_t_raw_buffer (
    id              BIGSERIAL PRIMARY KEY,
    device_sn       VARCHAR(50) NOT NULL,
    payload_json    JSONB,
    received_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_processed    BOOLEAN DEFAULT FALSE
);
```

## 4. Key Naming Conventions

*   **Primary Keys**: `id` or `[entity]_id`
*   **Audit Fields**: `created_by`, `created_dt`, `changed_by`, `changed_dt`
*   **Business Keys**: `_no` or `_code` suffix
*   **Table Prefixes**: `TB_M_` (Master), `TB_R_` (Transaction), `TB_T_` (Temporary)

## 5. Indexing & Optimization Strategies

To maintain high performance during national-scale telemetry ingestion, the following indexing strategies are applied:

1.  **Composite Time-Series Indexes**:
    *   `idx_raw_web_recording_dt` on `tb_r_ecg_raw_web(recording_id, created_dt)`: Optimized for sequential signal retrieval and plotting.
    *   `idx_raw_mobile_recording_dt` on `tb_r_ecg_raw_mobile(recording_id, created_dt)`: Optimized for mobile platform signal retrieval.
    *   `idx_perf_device_dt` on `tb_r_performance_log(device_id, created_dt)`: Optimized for real-time monitoring and historical performance analysis.

2.  **Lookup & Relationship Indexes**:
    *   `unique_user_sid`: Enforces single-session logic on `tb_m_user(current_session_id)`.
    *   `idx_patient_user`: Linked index between authentication and clinical profiles.
    *   `idx_session_recording`: Primary identifier for recording sessions and AI classification results.

3.  **Audit & Lifecycle Indexes**:
    *   All tables include indexes on `created_dt` and `changed_dt` to support administrative reporting and automated cleanup workers.
