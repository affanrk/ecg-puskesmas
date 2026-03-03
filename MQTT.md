# MQTT Protocol Documentation (v2.0)

This document describes the high-frequency data streaming protocol used for ECG data ingestion. The MQTT broker acts as the "Data Pipe" connecting ECG devices (including mobile apps acting as devices) to the Backend.

---

## 1. Connection Details

*   **Broker Address:** Configured via `MQTT_BROKER` environment variable.
*   **Port:** Default `1883` (TCP) or `8883` (SSL/TLS).
*   **Authentication:** Supports Username/Password and TLS/SSL (configurable).
*   **QoS:** `0` (Fire and forget - recommended for high-frequency streaming).
*   **Topic Pattern:** `raw/ecg/+` (Backend subscribes to all devices).
*   **Device Topic:** `raw/ecg/{DEVICE_ID}` (Devices publish here).

---

## 2. Topic Structure

All ECG data must be published to a topic following this structure:
`raw/ecg/{device_id}`

*   `device_id`: A unique string identifying the ECG hardware or the mobile app instance.
*   **Discovery:** When the backend receives a message from a new `device_id`, it automatically registers the device in the memory state and notifies all connected WebSocket clients via `device_list_update`.

---

## 3. Payload Formats

The backend supports two JSON payload formats: **Single Sample** and **Batch** (optimized for network efficiency). The backend uses an internal **Jitter Buffer** (up to 20 packets) to handle out-of-order delivery and minor network fluctuations.

### A. Single Sample Format
```json
{
  "id": "ECG_DEVICE_001",
  "ts_us": 1700000000000000,
  "cnt": 1001,
  "r1": 123456,
  "r2": 234567,
  "r3": 345678,
  "c1": 0.123,
  "c2": 0.456,
  "c3": -0.123,
  "c4": 0.111,
  "c5": 0.222,
  "sps": 100
}
```

### B. Batch Format (Recommended)
Use this to reduce network overhead by sending multiple samples in one packet. The `ts_us` and `cnt` should refer to the **last sample** in the batch.

```json
{
  "id": "ECG_DEVICE_001",
  "ts_us": 1700000000000000,
  "cnt": 1010,
  "r1": [123456, 123457, 123458],
  "r2": [234567, 234568, 234569],
  "r3": [345678, 345679, 345680],
  "c1": [0.123, 0.124, 0.125],
  "c2": [0.456, 0.457, 0.458],
  "c3": [-0.123, -0.122, -0.121],
  "c4": [0.111, 0.112, 0.113],
  "c5": [0.222, 0.223, 0.224],
  "sps": 100
}
```

---

## 4. Field Definitions

| Field | Description | Mapping | Unit |
| :--- | :--- | :--- | :--- |
| `id` | Unique Device Identifier | - | String |
| `ts_us` | Timestamp (Server/Device) | - | Microseconds (μs) |
| `cnt` / `counter` | Sequential packet number | - | Integer |
| `r1` / `raw_c1` | Raw ADC - Lead I | Lead I | Integer |
| `r2` / `raw_c2` | Raw ADC - Lead II | Lead II | Integer |
| `r3` / `raw_c3` | Raw ADC - Lead V1 | Lead V1 | Integer |
| `c1` / `cal_mv_c1` | Calibrated mV - Lead I | Lead I | Millivolts (mV) |
| `c2` / `cal_mv_c2` | Calibrated mV - Lead II | Lead II | Millivolts (mV) |
| `c3` / `cal_mv_c3` | Calibrated mV - Lead V1 | Lead V1 | Millivolts (mV) |
| `c4` / `cal_mv_c4` | Calibrated mV - Lead III | Lead III | Millivolts (mV) |
| `c5` / `cal_mv_c5` | Calibrated mV - aVF | aVF | Millivolts (mV) |
| `sps` / `rate` | Sampling Rate | - | Hz (default 100) |

---

## 5. Technical Pipeline & Safety

### 5.1 Jitter Buffer & Sequence Enforcement
1.  **Duplicate Check:** Any packet with `cnt` <= `last_processed_cnt` is silently discarded.
2.  **Jitter Handling:** Packets arriving out of order are placed in a heap-based buffer (max 20 packets).
3.  **Sequence Break:** If a gap > 20 packets occurs, the system assumes a critical disconnect, clears buffers, and resets the device state (notifying UI via `device_disconnected`).

### 5.2 Real-time Processing
*   **Filtering:** Lead I, II, III, aVF, and V1 are processed through a real-time Butterworth filter (Highpass 0.6Hz) before visualization.
*   **Live BPM:** The backend calculates HR from Lead II samples every 100 packets and broadcasts it via WebSocket.
*   **Network Metrics:** Packet loss is calculated by comparing `cnt` jumps. Latency is measured via arrival intervals.

### 5.3 Recording Logic
Incoming data is only stored in the database if the device's `is_recording` flag is `true`. The data is automatically routed to:
*   `tb_r_ecg_raw_web`: If session source is `WEB` or `ADMIN`.
*   `tb_r_ecg_raw_mobile`: If session source is `MOBILE`.
*   Data is buffered and flushed in chunks (default 2000 samples) to ensure high-performance writes.
