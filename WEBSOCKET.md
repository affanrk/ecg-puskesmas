# WebSocket API Documentation (v2.0)

This document describes the real-time communication protocol for the ECG Platform. This bi-directional connection is the core for live monitoring, device orchestration, and real-time AI analysis feedback.

---

## 1. Connection Overview

*   **Endpoint:** `/ws`
*   **Protocol:** `ws://` or `wss://`
*   **Authentication:** Requires a valid JWT passed via the `token` query parameter.
    *   Example: `ws://server:8080/ws?token=eyJhbGci...`
*   **Format:** All messages are strictly **JSON objects**.
*   **Port:** Default is `8080` (Backend FastAPI).

---

## 2. Connection Lifecycle & Handshake

1.  **Handshake:** Client initiates connection with token.
2.  **Authentication:** Server verifies JWT and session ID (`sid`). If session is expired or mismatched (due to "Last Login Wins"), connection is closed with code `4003`.
    *   If the JWT is invalid or the referenced user cannot be found, the server sends an `error` message and closes the connection.
3.  **Registration:** Once authenticated, the connection is registered in the `DeviceStateManager` for global broadcasts.
4.  **Initial Payload:** Server immediately sends `device_list_update`.
5.  **Steady State:** Client should maintain connection using Heartbeat (Ping/Pong every 10-30s).
6.  **Cleanup:** On disconnect, the server automatically unsubscribes the client from any locked devices and stops any active recordings owned by that session.

---

## 3. Client-to-Server Messages (Commands)

| Type (`type`) | Payload Description | Purpose | Server Response (Success Flow) |
| :--- | :--- | :--- | :--- |
| `ping` | `{}` | Standard heartbeat request. | `pong` |
| `pong` | `{}` | Response to server-initiated `ping`. | (None) |
| `subscribe_to_device` | `{ "device_id": "string" }` | Locks a device to this session. Starts live data stream. | `subscription_success`, `device_status_update`, `state_update` |
| `unsubscribe` | `{}` | Releases current device lock and stops data stream. | `unsubscription_success`, then global `device_list_update` |
| `start_recording` | `{ "device_id": "string", "patient_id": "string?" "source": "WEB", "lead_mode": 5 }` | Initiates a recording session. Creates a database session record and locks device state. `source` defaults to `WEB`. | `state_update` (is_recording status changes to true) |
| `stop_recording` | `{ "device_id": "string" }` | Forces current recording to complete and triggers analysis. | `state_update` (is_recording status changes to false) |
| `calculate_live_bpm` | `{ "device_id": "string", "data": [0.12, ...] }` | Request server-side HR calculation from raw samples. | `calculate_live_bpm` (Async result) |

> [!NOTE]
> The server responds with an `error` message for unauthorized requests, invalid parameters, or unexpected application errors.

---

## 4. Server-to-Client Messages (Events)

### 4.1 System & Discovery
*   **`device_list_update`**: Sent on connect and whenever any device's connectivity or lock status changes globally.
    ```json
    { 
        "type": "device_list_update", 
        "devices": [
            { 
                "id": "ECG001", 
                "is_connected": true, 
                "is_locked": false, 
                "status": "Idle",
                "lead_mode": 5 
            }
        ] 
    }
    ```
*   **`device_status_update`**: Specific update for the currently subscribed device.
    ```json
    { 
        "type": "device_status_update", 
        "device_id": "ECG001", 
        "status": "Connected" 
    }
    ```
*   **`device_disconnected`**: Sent when a device heartbeat is lost (Watchdog > 2.0s) or gracefully disconnects.
    ```json
    { 
        "type": "device_disconnected", 
        "device_id": "ECG001",
        "reason": "Timeout",
        "was_recording": false
    }
    ```
*   **`subscription_success`**: Confirms lock acquisition successfully completed on a device.
    ```json
    {
        "type": "subscription_success",
        "device_id": "ECG001"
    }
    ```
*   **`unsubscription_success`**: Confirms lock release.
    ```json
    {
        "type": "unsubscription_success",
        "device_id": "ECG001"
    }
    ```

### 4.2 Live Monitoring
*   **`live_5leads_batch`**: High-frequency ECG samples for 5-lead devices.
    ```json
    { 
      "type": "live_5leads_batch", 
      "device_id": "string", 
      "samples": [{ "i": 0.1, "ii": 0.2, "v1": 0.1, ... }],
      "counter": 12345
    }
    ```
*   **`live_12leads_batch`**: High-frequency ECG samples for 12-lead devices.
    ```json
    { 
      "type": "live_12leads_batch", 
      "device_id": "string", 
      "samples": [{ "i": 0.1, "ii": 0.2, "iii": 0.1, "avr": 0.1, "avl": 0.1, "avf": 0.1, "v1": 0.1, ... }],
      "counter": 12345
    }
    ```
*   **`calculate_live_bpm`**: Async result of a BPM calculation request.
    ```json
    { 
        "type": "calculate_live_bpm", 
        "device_id": "string", 
        "data": { "bpm": 72.5 } 
    }
    ```
*   **`performance_update`**: Real-time network health metrics.
    ```json
    { 
        "type": "performance_update", 
        "device_id": "string", 
        "latency_ms": 45.2, 
        "jitter_ms": 2.1, 
        "packet_loss_pct": 0.0 
    }
    ```

### 4.3 Recording Control
*   **`state_update`**: Sent whenever recording starts, stops, or changes state.
    ```json
    { 
      "type": "state_update", 
      "device_id": "string",
      "is_recording": true, 
      "status_message": "Recording...", 
      "recording_id": "uuid", 
      "subject_id": "USR2024..." 
    }
    ```
*   **`progress_update`**: Granular progress of the current recording buffer.
    ```json
    { 
        "type": "progress_update", 
        "current": 250, 
        "total": 1000 
    }
    ```
*   **`live_result`**: AI classification result once a segment is processed.
    ```json
    { 
      "type": "live_result", 
      "device_id": "ECG001",
      "recording_id": "uuid", 
      "classification": "Normal", 
      "confidence": 0.98,
      "changed_dt": "2026-04-07T08:20:34+00:00"
    }
    ```
*   **`recording_cancelled`**: Notifies that an active recording was discarded (e.g. timeout or manual cancel).
    ```json
    {
      "type": "recording_cancelled",
      "device_id": "ECG001",
      "reason": "Device timeout",
      "clear_buffer": true
    }
    ```
*   **`history_updated`**: Global signal to refresh history lists/tables (Reserved for future synchronization).
    ```json
    {
      "type": "history_updated"
    }
    ```

---

## 5. Start Recording Flow (Detailed)

### 5.1 Request Payload
```json
{
  "type": "start_recording",
  "device_id": "ECG001",          // Required: Target device identifier
  "patient_id": "PAT20240407",    // Optional: Patient ID (if recording for a patient)
  "source": "WEB",                 // Optional: Recording source (defaults to "WEB", can be "MOBILE", "DEVICE")
  "lead_mode": 5                   // Optional: Expected lead mode (5 or 12). If provided, validated against device's current mode
}
```

### 5.2 Processing Logic
1. **Validation Phase:**
   - Verifies `device_id` is provided
   - Checks device is currently connected (exists in `DeviceStateManager`)
   - If `lead_mode` is specified, validates it matches the device's current lead mode
   
2. **Session Creation Phase:**
   - Generates unique `recording_id` (UUID)
   - Determines `device_type` based on device's current lead mode:
     - 12 leads → `"12LEADS"`
     - 5 leads → `"5LEADS"`
   - Creates database session record with:
     - `recording_id`: Generated UUID
     - `device_id`: Requested device
     - `user_id`: Current authenticated user ID (only if `patient_id` is NOT provided)
     - `patient_id`: If provided in request
     - `created_by`: Source value (defaults to `"WEB"`)
     - `device_type`: Auto-detected device type
   
3. **State Update Phase:**
   - Locks the device state for this recording:
     - `is_recording = true`
     - `recording_id = <generated UUID>`
     - `subject_id = patient_id` (if provided) or `user_id` (if not)
     - `segment_count = 1`
     - `recording_source = source`
     - `status_message = "Recording..."`
   - Broadcasts `state_update` to all subscribers of this device

### 5.3 Response States & Error Handling

**Success Response:**
```json
{
  "type": "state_update",
  "device_id": "ECG001",
  "is_recording": true,
  "status_message": "Recording...",
  "recording_id": "550e8400-e29b-41d4-a716-446655440000",
  "subject_id": "PAT20240407"  // or user ID if no patient_id
}
```

**Error Scenarios:**

| Error | Cause | Response |
| :--- | :--- | :--- |
| Missing `device_id` | Client did not provide required field | Warning logged, no error message sent (handler returns without sending) |
| Device not connected | Device not in `DeviceStateManager` | Warning logged, no error message sent |
| Lead mode mismatch | Requested `lead_mode` differs from device's current mode | Warning logged, no error message sent |
| Database failure | Session record creation fails | `{ "type": "error", "message": "Failed to create recording session in database." }` |
| Application error | Internal app exception during processing | `{ "type": "error", "message": "<exception message>" }` |
| Unexpected error | Unhandled exception | `{ "type": "error", "message": "Internal Server Error" }` |

### 5.4 Important Behavioral Notes
- **Device Lock:** Once recording starts, the device is effectively locked to this recording session until the recording is stopped.
- **User vs. Patient Mode:** 
  - If `patient_id` is provided, the recording is linked to that patient; `user_id` is `null` in the session record.
  - If `patient_id` is omitted, the recording is linked to the authenticated user; `patient_id` is `null`.
- **Silent Errors:** Some validation failures (missing device_id, device not connected, lead_mode mismatch) are logged but do NOT send error messages to the client. The client must implement timeout logic to detect failed recording starts.
- **Broadcast Scope:** All clients subscribed to the same device receive the `state_update` message.

---

### Storage mapping & indexing

Live recordings and flushed buffer chunks are written to the same raw-data tables used by the MQTT pipeline. Mapping:

- 5-lead web samples -> `tb_r_ecg_raw_5leads_web`
- 5-lead mobile samples -> `tb_r_ecg_raw_5leads_mobile`
- 12-lead web samples -> `tb_r_ecg_raw_12leads_web`
- 12-lead mobile samples -> `tb_r_ecg_raw_12leads_mobile`

Each table stores per-sample `mv_*`/`raw_*` columns, `created_dt`, and `created_by` (e.g. `WEB`, `MOBILE`, `DEVICE`). For efficient sequential reads during playback or analysis, create a composite index on `(recording_id, created_dt)`. Example:

```sql
CREATE INDEX idx_raw_5leads_web_recording_dt ON tb_r_ecg_raw_5leads_web (recording_id, created_dt);
CREATE INDEX idx_raw_5leads_mobile_recording_dt ON tb_r_ecg_raw_5leads_mobile (recording_id, created_dt);
CREATE INDEX idx_raw_12leads_web_recording_dt ON tb_r_ecg_raw_12leads_web (recording_id, created_dt);
CREATE INDEX idx_raw_12leads_mobile_recording_dt ON tb_r_ecg_raw_12leads_mobile (recording_id, created_dt);
```

---

## 5. Security & Session Management

### 5.1 Single Session Enforcement (SSE)
The system uses the `sid` (Session ID) claim in the JWT to identify unique logins.
*   If a new login occurs, the old `sid` becomes invalid in the database.
*   The WebSocket `verify_session` check handles this gracefully.
*   The server sends an `error` message and closes the connection with code `4003`.

### 5.2 Error Messages
General error format. Used for application errors, unauthorized actions, or session expiration.
```json
{
  "type": "error",
  "message": "Session expired: User logged in from another device"
}
```

---

## 6. Enumerations & Constants

### ECG Classifications (`live_result`)
*   `Normal`
*   `Abnormal`
*   `Berpotensi Aritmia`
*   `Sangat Berpotensi Aritmia`
*   `Unknown`
*   `Pending`
*   `Recording...`
*   `Insufficient Data`

### Network Thresholds
*   **Heartbeat Timeout:** 2.0s (Triggers `device_disconnected`)
*   **Offline Indicator:** 1.0s (UI marks device as yellow/offline)
*   **Sampling Rate:** Default 100 Hz (5 Leads) / 853 Hz (12 Leads).
