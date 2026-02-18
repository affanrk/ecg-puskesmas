# MQTT Protocol Documentation

This document describes the high-frequency data streaming protocol used for ECG data ingestion. The MQTT broker acts as the "Data Pipe" connecting ECG devices (including mobile apps acting as devices) to the Backend.

## 1. Connection Details

*   **Broker Address:** `<Depends on Environment>` (e.g., `test.mosquitto.org` or internal IP)
*   **Port:** `1883` (TCP) or `8883` (SSL/TLS)
*   **QoS:** `0` (Fire and forget - recommended for high-frequency streaming)
*   **Topic Pattern:** `raw/ecg/<DEVICE_ID>`

---

## 2. Topic Structure

All ECG data must be published to a topic following this structure:
`raw/ecg/{device_id}`

*   `device_id`: A unique string identifying the ECG hardware or the mobile app instance.

---

## 3. Payload Formats

The backend supports two JSON payload formats: **Single Sample** (simple) and **Batch** (optimized for network efficiency).

### A. Single Sample Format
Use this for simple implementations or very low latency requirements.

```json
{
  "id": "MOBILE_DEVICE_001",
  "ts_us": 1700000000000000,
  "counter": 1001,
  "raw_c1": 123456,
  "raw_c2": 234567,
  "raw_c3": 345678,
  "cal_mv_c1": 0.123,
  "cal_mv_c2": 0.456,
  "cal_mv_c3": -0.123,
  "sps": 100
}
```

### B. Batch Format (Recommended)
Use this to reduce network overhead by sending multiple samples in one packet.

```json
{
  "id": "MOBILE_DEVICE_001",
  "ts_us": 1700000000000000,
  "cnt": 1010,
  "r1": [123456, 123457, 123458],
  "r2": [234567, 234568, 234569],
  "r3": [345678, 345679, 345680],
  "c1": [0.123, 0.124, 0.125],
  "c2": [0.456, 0.457, 0.458],
  "c3": [-0.123, -0.122, -0.121],
  "sps": 100
}
```

---

## 4. Field Definitions

| Field (Single) | Field (Batch) | Description | Unit |
| :--- | :--- | :--- | :--- |
| `id` | `id` | Unique Device Identifier | String |
| `ts_us` | `ts_us` | Server/Device Timestamp | Microseconds (μs) |
| `counter` | `cnt` | Sequential packet number (for loss detection) | Integer |
| `raw_c1` | `r1` | Lead I Raw ADC Value | Integer |
| `raw_c2` | `r2` | Lead II Raw ADC Value | Integer |
| `raw_c3` | `r3` | Lead V1 Raw ADC Value | Integer |
| `cal_mv_c1` | `c1` | Lead I Calibrated Value | Millivolts (mV) |
| `cal_mv_c2` | `c2` | Lead II Calibrated Value | Millivolts (mV) |
| `cal_mv_c3` | `c3` | Lead V1 Calibrated Value | Millivolts (mV) |
| `sps` | `sps` | Sampling Rate (optional, defaults to 100) | Hz |

---

## 5. Implementation Notes

1.  **Continuous Streaming:** Devices should start publishing data as soon as they are active and connected to the internet, regardless of whether a recording session is active.
2.  **Calibrated Values:** The backend uses `cal_mv` fields for real-time visualization and AI analysis. Ensure your conversion logic from ADC to mV is correct before publishing.
3.  **Timestamps:** If `ts_us` is not provided, the backend will use the server's arrival time, which may introduce jitter.
4.  **Packet Loss:** The `counter` / `cnt` field is used by the backend to calculate the "Packet Loss %" shown on the dashboard. Ensure it increments by 1 (or by batch size) for every publish.
5.  **Session Association:** Incoming MQTT data is only saved to the database if an active recording session is found for the `device_id`. The backend automatically routes data to the correct time-series table based on the session's source:
    *   `tb_r_ecg_raw_web`: Primary storage for web-initiated sessions.
    *   `tb_r_ecg_raw_mobile`: Specialized storage for mobile-initiated telemetry.
    *   Association is based on the `user_id` (Sequential ID: `USR...`) and `subject_id` (NIK string) provided during the WebSocket `start_recording` command.
