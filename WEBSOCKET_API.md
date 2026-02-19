# WebSocket API Documentation

This document describes the real-time communication protocol for the ECG Platform. Unlike the REST API, this is a persistent bi-directional connection used for live monitoring and recording control.

## 1. Connection Details

*   **Endpoint:** `/api/v1/ws`
*   **Protocol:** `ws://` (unsecured) or `wss://` (secured)
*   **Format:** All messages are sent and received as **JSON strings**.

---

## 2. Connection Lifecycle
1.  **Handshake:** Client connects to the endpoint.
2.  **Initial State:** Upon connection, the server immediately broadcasts the current `device_list_update`.
3.  **Active Monitoring:** Client must send `subscribe_to_device` to receive live updates for a specific device. This also "locks" the device control to your connection.
4.  **Heartbeat:** Clients should respond to `ping` messages with a `pong` to keep the connection alive.

---

## 3. Client to Server Messages (Commands)

### Subscribe to Device
Locks a device to your connection and starts receiving its live updates.
*   **Request:**
    ```json
    {
      "type": "subscribe_to_device",
      "device_id": "string"
    }
    ```
*   **Success Response:** `device_status_update` (status: "Connected") followed by `state_update`.
*   **Fail Response:** `error` (e.g., "Device is busy or locked").

### Unsubscribe
Unlocks the current device and stops the live stream.
*   **Request:**
    ```json
    {
      "type": "unsubscribe"
    }
    ```
*   **Success Response:** `device_list_update` (device becomes unlocked for others).

### Start Recording
Initiates a new recording session where the backend begins saving incoming MQTT data to the database.
*   **Request:**
    ```json
    {
      "type": "start_recording",
      "device_id": "string",
      "user_id": "USR20260213000001",
      "source": "WEB" 
    }
    ```
*   **Fields:**
    *   `device_id`: Target device.
    *   `user_id`: Sequential String ID of the user (e.g., USR...).
    *   `source`: `"WEB"` or `"MOBILE"`. Controls the target storage:
        *   `WEB` -> `tb_r_ecg_raw_web`
        *   `MOBILE` -> `tb_r_ecg_raw_mobile`
*   **Success Response:** `state_update` (is_recording: true).

### Stop Recording
Completes the current recording session and triggers AI analysis.
*   **Request:**
    ```json
    {
      "type": "stop_recording",
      "device_id": "string"
    }
    ```
*   **Success Response:** `state_update` (status: "Analyzing...").

### Calculate Live BPM
Requests the server to calculate BPM from a provided array of Lead II ECG samples.
*   **Request:**
    ```json
    {
      "type": "calculate_live_bpm",
      "device_id": "string",
      "data": [0.12, 0.45, 0.88, "..."]
    }
    ```
*   **Fields:**
    *   `device_id`: Target device.
    *   `data`: An array of numeric values representing Lead II ECG samples.
*   **Success Response:** `calculate_live_bpm` containing the calculated BPM.

### Pong (Heartbeat)
Required response to server-initiated pings.
*   **Request:**
    ```json
    {
      "type": "pong"
    }
    ```

---

## 4. Server to Client Messages (Events)

### Device List Update
Sent automatically on connection or whenever a device's availability changes.
```json
{
  "type": "device_list_update",
  "devices": [
    { "id": "string", "is_locked": true, "status": "Recording...", "is_connected": true }
  ]
}
```

### Device Status Update
Sent to confirm a successful subscription or connection change.
```json
{
  "type": "device_status_update",
  "device_id": "string",
  "status": "Connected"
}
```

### State Update
Sent whenever a device's recording mode changes.
```json
{
  "type": "state_update",
  "device_id": "string",
  "is_recording": true,
  "status_message": "Recording...",
  "recording_id": "uuid",
  "subject_id": "3201234567890001"
}
```

### Live Data (Batch)
High-frequency real-time ECG samples for visualization.
```json
{
  "type": "live_batch",
  "device_id": "string",
  "samples": [
    { "i": 0.123, "ii": 0.456, "v1": -0.123 }
  ]
}
```

### Calculate Live BPM (Metrics)
Periodic Heart Rate updates calculated in real-time.
```json
{
  "type": "calculate_live_bpm",
  "device_id": "string",
  "data": { "bpm": 72.5 }
}
```

### Progress Update
Sent every 25 samples during recording to track buffer progress.
```json
{
  "type": "progress_update",
  "device_id": "string",
  "current": 250,
  "total": 1000
}
```

### Live Result (AI Analysis)
Sent immediately after AI analysis is complete.
```json
{
  "type": "live_result",
  "device_id": "string",
  "recording_id": "uuid",
  "classification": "Normal",
  "confidence": 0.98,
  "changed_dt": "2024-01-01T12:00:00Z"
}
```

### Performance Update
Real-time network health metrics for the data stream.
```json
{
  "type": "performance_update",
  "device_id": "string",
  "latency_ms": 45.2,
  "jitter_ms": 2.1,
  "packet_loss_pct": 0.05
}
```

### Error
Sent when a command fails or an internal server error occurs.
```json
{
  "type": "error",
  "message": "Detailed error message"
}
```

---

## 5. Security & Session Management

### Authentication
Connections **must** provide a valid JWT in the query string during the initial handshake. The server will reject any connection attempt without a valid token or with an `undefined`/`null` token string.

**URL Format:**
`ws://server/api/v1/ws?token=YOUR_JWT_TOKEN`

### Last Login Wins (Session Enforcement)
The platform enforces a single active session per user to ensure data integrity and security.
1.  **Session ID (`sid`):** Every JWT contains a unique `sid` claim generated at login.
2.  **Enforcement:** When a user logs in from a new device, tab, or platform (e.g., Mobile), the `current_session_id` in the database is updated, instantly invalidating all previous tokens.
3.  **Automatic Termination:** If the WebSocket server receives a message or heartbeat from a connection whose `sid` no longer matches the database, it will:
    *   Send an `error` message: `"Session expired: User logged in from another device"`.
    *   Close the connection with code `4003`.
    *   The frontend will automatically clear local storage and redirect the user to the login page.

---

## 6. Classification Categories
The `classification` field in `live_result` will return one of:
*   `Normal`
*   `Abnormal`
*   `Berpotensi Aritmia`
*   `Sangat Berpotensi Aritmia`
*   `Unknown`
*   `Insufficient Data` (if < 500 samples collected)
