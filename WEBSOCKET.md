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
3.  **Registration:** Once authenticated, the connection is registered in the `DeviceStateManager` for global broadcasts.
4.  **Initial Payload:** Server immediately sends `device_list_update`.
5.  **Steady State:** Client should maintain connection using Heartbeat (Ping/Pong every 10-30s).
6.  **Cleanup:** On disconnect, the server automatically unsubscribes the client from any locked devices and stops any active recordings owned by that session.

---

## 3. Client-to-Server Messages (Commands)

| Type (`type`) | Payload Description | Purpose |
| :--- | :--- | :--- |
| `ping` | `{}` | Standard heartbeat request. Server responds with `pong`. |
| `pong` | `{}` | Response to server-initiated `ping`. |
| `subscribe_to_device` | `{ "device_id": "string" }` | Locks a device to this session. Starts receiving `live_batch` and `performance_update`. |
| `unsubscribe` | `{}` | Releases current device lock and stops data stream. |
| `start_recording` | `{ "device_id": "string", "source": "WEB" }` | Initiates a recording session. `source` defaults to `WEB`. |
| `stop_recording` | `{ "device_id": "string" }` | Forces current recording to complete and triggers analysis. |
| `calculate_live_bpm` | `{ "device_id": "string", "data": [0.12, ...] }` | Request server-side HR calculation from raw samples. |

---

## 4. Server-to-Client Messages (Events)

### 4.1 System & Discovery
*   **`device_list_update`**: Sent on connect and whenever any device's connectivity or lock status changes.
    ```json
    { 
        "type": "device_list_update", 
        "devices": 
        [
            { 
                "id": "ECG001", 
                "is_connected": true, 
                "is_locked": false, 
                "status": "Idle" 
            }, ...
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
*   **`device_disconnected`**: Sent when a device heartbeat is lost (Watchdog > 2.0s).
    ```json
    { 
        "type": "device_disconnected", 
        "device_id": "ECG001" 
    }
    ```

### 4.2 Live Monitoring
*   **`live_batch`**: High-frequency ECG samples for visualization.
    ```json
    { 
      "type": "live_batch", 
      "device_id": "string", 
      "samples": [{ "i": 0.1, "ii": 0.2, "iii": 0.1, "avf": 0.1, "v1": 0.2 }, ...],
      "counter": 12345,
      "sampling_rate": 100
    }
    ```
*   **`calculate_live_bpm`**: Async result of a BPM calculation request.
    ```json
    { 
        "type": "calculate_live_bpm", 
        "device_id": "string", 
        "data": 
        { 
            "bpm": 72 
        } 
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
*   **`state_update`**: Sent whenever recording starts, stops, or changes segment.
    ```json
    { 
      "type": "state_update", 
      "is_recording": true, 
      "status_message": "Recording (Seg 1)...", 
      "recording_id": "uuid", 
      "subject_id": "USR2024..." 
    }
    ```
*   **`progress_update`**: Granular progress of the current buffer (sent every 25 samples).
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
      "recording_id": "uuid", 
      "classification": "Normal", 
      "confidence": 0.98,
      "changed_dt": "ISO8601-Timestamp"
    }
    ```
*   **`recording_cancelled`**: Notifies that an active recording was discarded (e.g., due to disconnect).
*   **`history_updated`**: Global signal to refresh history lists/tables.

---

## 5. Security & Session Management

### 5.1 Single Session Enforcement (SSE)
The system uses the `sid` (Session ID) claim in the JWT to identify unique logins.
*   If a new login occurs, the old `sid` becomes invalid in the database.
*   The WebSocket `verify_session` check will fail.
*   The server sends an `error` message with code `4003` and closes the connection.

### 5.2 Error Message Format
```json
{
  "type": "error",
  "message": "Session expired: User logged in from another device",
  "code": "SESSION_EXPIRED",
  "active_sid": "new-session-uuid"
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
*   `Insufficient Data` (Triggered if < 500 samples are present)

### Network Thresholds
*   **Heartbeat Timeout:** 2.0s (Triggers `device_disconnected`)
*   **Offline Indicator:** 1.0s (UI marks device as yellow/offline)
*   **Sampling Rate:** Default 100 Hz.
