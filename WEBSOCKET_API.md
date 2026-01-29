# WebSocket API Documentation

This document describes the real-time communication protocol for the ECG Platform. Unlike the REST API, this is a persistent bi-directional connection used for live streaming and recording control.

## 1. Connection Details

*   **Endpoint:** `/api/v1/ws`
*   **Protocol:** `ws://` (unsecured) or `wss://` (secured)
*   **Example URL:** `ws://localhost:8080/api/v1/ws`
*   **Format:** All messages are sent and received as **JSON strings**.

---

## 2. Connection Lifecycle
1.  **Handshake:** Client connects to the endpoint.
2.  **Initial State:** Upon connection, the server immediately broadcasts the current `device_list_update`.
3.  **Active Monitoring:** Client must send `subscribe_to_device` to receive live data for a specific device.
4.  **Heartbeat:** Clients should respond to `ping` messages with a `pong` to keep the connection alive.

---

## 3. Client to Server Messages (Commands)

### Subscribe to Device
Locks a device to your connection and starts receiving its live stream.
```json
{
  "type": "subscribe_to_device",
  "device_id": "string"
}
```

### Unsubscribe
Unlocks the current device and stops the live stream.
```json
{
  "type": "unsubscribe"
}
```

### Start Recording
Starts a new recording session. Requires the device to be subscribed first.
```json
{
  "type": "start_recording",
  "device_id": "string",
  "user_id": "number"
}
```

### Stop Recording
Completes the current recording session and triggers AI analysis.
```json
{
  "type": "stop_recording",
  "device_id": "string"
}
```

### Pong (Heartbeat)
Required response to server-initiated pings.
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
    { "id": "string", "is_locked": "boolean", "status": "string" }
  ]
}
```

### Live Data (Batch)
High-frequency real-time ECG samples.
```json
{
  "type": "live_batch",
  "device_id": "string",
  "samples": [
    { "i": 0.123, "ii": 0.456, "v1": -0.123 }
  ]
}
```

### Live Result (AI Analysis)
Sent when a recording segment is finished and analyzed by the ML model.
```json
{
  "type": "live_result",
  "device_id": "string",
  "recording_id": "uuid",
  "classification": "string",
  "confidence": 0.98
}
```

### Performance Update
Network health metrics.
```json
{
  "type": "performance_update",
  "latency_ms": 45.2,
  "jitter_ms": 2.1,
  "packet_loss_pct": 0.01
}
```

### State Update
Sent when a device enters or leaves recording mode.
```json
{
  "type": "state_update",
  "device_id": "string",
  "is_recording": "boolean",
  "recording_id": "uuid",
  "subject_id": "string"
}
```

### Error
Sent when a command fails.
```json
{
  "type": "error",
  "message": "Detailed error message"
}
```

---

## 5. Classification Codes
The `classification` field in `live_result` will return one of the following strings:
*   `Normal`
*   `Abnormal`
*   `Berpotensi Aritmia`
*   `Sangat Berpotensi Aritmia`
*   `Unknown`
