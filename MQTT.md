# MQTT Protocol Documentation (v2.0)

This document describes the high-frequency data streaming protocol used for ECG data ingestion. The MQTT broker acts as the "Data Pipe" connecting ECG devices (including mobile apps acting as devices) to the Backend.

---

## 1. Connection Details

*   **Broker Address:** Configured via `MQTT_BROKER` environment variable.
*   **Port:** Default `1883` (TCP) or `8883` (SSL/TLS).
*   **Authentication:** Supports Username/Password and TLS/SSL (configurable).
*   **QoS:** `0` (Fire and forget - recommended for high-frequency streaming).
*   **Topic Pattern (5-Leads):** `raw/ecg/+` (Backend subscribes to all devices).
*   **Topic Pattern (12-Leads):** `raw/ecg/12leads/+`
*   **Device Topic:** `raw/ecg/{DEVICE_ID}` or `raw/ecg/12leads/{DEVICE_ID}`

---

## 2. Topic Structure

All ECG data must be published to a topic following this structure:
`raw/ecg/{device_id}` or `raw/ecg/12leads/{device_id}`

*   `device_id`: A unique string identifying the ECG hardware or the mobile app instance.
*   **Discovery:** When the backend receives a message from a new `device_id`, it automatically registers the device in the memory state and notifies all connected WebSocket clients via `device_list_update`.

---

## 3. Payload Formats

The backend supports **Batch** formats (optimized for network efficiency). The backend uses an internal **Jitter Buffer** (up to 20 packets) to handle out-of-order delivery and minor network fluctuations.

### 3.1. 5-Leads Format (Batch)
```json
{
  "id": "ECG_001",
  "ts_us": 1700000000000000,
  "cnt": 1010,
  "r1": [1234, ...], "r2": [...], "r3": [...],
  "c1": [0.12, ...], "c2": [...], "c3": [...], "c4": [...], "c5": [...],
  "sps": 100
}
```

### 3.2. 12-Leads Format (Batch)
For 12-lead devices, the payload includes all 12 chest and limb leads.

```json
{
  "id": "ECG_12L_001",
  "ts_us": 1700000000000000,
  "cnt": 500,
  "r1": [100, ...], "r2": [...], "r3": [...], "r4": [...], "r5": [...], "r6": [...], 
  "r7": [...], "r8": [...], "r9": [...], "r10": [...], "r11": [...], "r12": [...],
  "c1": [0.1, ...], "c2": [...], "c3": [...], "c4": [...], "c5": [...], "c6": [...],
  "c7": [...], "c8": [...], "c9": [...], "c10": [...], "c11": [...], "c12": [...]
}
```

---

## 4. Field Definitions & Mappings

| Field | 5-Leads Mapping | 12-Leads Mapping | Unit |
| :--- | :--- | :--- | :--- |
| `r1`..`r3` | Raw I, II, V1 | Raw I, II, III | Integer |
| `r4`..`r6` | - | Raw aVR, aVL, aVF | Integer |
| `r7`..`r12` | - | Raw V1, V2, V3, V4, V5, V6 | Integer |
| `c1`..`c3` | Cal I, II, V1 | Cal I, II, III | mV |
| `c4` | Cal III | Cal aVR | mV |
| `c5` | Cal aVF | Cal aVL | mV |
| `c6` | - | Cal aVF | mV |
| `c7`..`c12` | - | Cal V1, V2, V3, V4, V5, V6 | mV |

---

## 5. Technical Pipeline & Safety

### 5.1 Jitter Buffer & Sequence Enforcement
1.  **Duplicate Check:** Any packet with `cnt` <= `last_processed_cnt` is silently discarded.
2.  **Jitter Handling:** Packets arriving out of order are placed in a heap-based buffer (max 20 packets).
3.  **Sequence Break:** If a gap > 20 packets occurs, the system assumes a critical disconnect, clears buffers, and resets the device state (notifying UI via `device_disconnected`).

### 5.2 Real-time Processing
*   **Filtering:** Leads are processed through a real-time Butterworth filter (Highpass 0.6Hz) before visualization.
*   **Live BPM:** The backend calculates HR from Lead II samples every 100 packets and broadcasts it via WebSocket.
*   **Network Metrics:** Packet loss is calculated by comparing `cnt` jumps. Latency is measured via arrival intervals.

### 5.3 Recording Logic
Incoming data is only stored in the database if the device's `is_recording` flag is `true`. The data is automatically routed to:
*   `tb_r_ecg_raw_5leads_web/mobile`: For 5-Lead devices.
*   `tb_r_ecg_raw_12leads_web/mobile`: For 12-Lead devices.
*   Data is buffered and flushed in chunks (default 2000 samples) to ensure high-performance writes.

**Storage mapping & indexing**

- 5-lead web samples -> `tb_r_ecg_raw_5leads_web`
- 5-lead mobile samples -> `tb_r_ecg_raw_5leads_mobile`
- 12-lead web samples -> `tb_r_ecg_raw_12leads_web`
- 12-lead mobile samples -> `tb_r_ecg_raw_12leads_mobile`

Each raw-data table contains per-sample `mv_*` and `raw_*` columns, `created_dt`, and `created_by`.
Create a composite index on `(recording_id, created_dt)` for each table to support fast sequential reads. Example SQL:

```sql
CREATE INDEX idx_raw_5leads_web_recording_dt ON tb_r_ecg_raw_5leads_web (recording_id, created_dt);
CREATE INDEX idx_raw_5leads_mobile_recording_dt ON tb_r_ecg_raw_5leads_mobile (recording_id, created_dt);
CREATE INDEX idx_raw_12leads_web_recording_dt ON tb_r_ecg_raw_12leads_web (recording_id, created_dt);
CREATE INDEX idx_raw_12leads_mobile_recording_dt ON tb_r_ecg_raw_12leads_mobile (recording_id, created_dt);
```
