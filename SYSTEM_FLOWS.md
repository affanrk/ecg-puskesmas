# System Flow Documentation

This document details the low-level code execution paths for the ECG Live Platform. It maps logical flows to specific files, classes, and functions within the codebase.

---

## 1. Device Connection & Data Ingestion
*Flow of raw data from MQTT Broker to Memory/UI.*

### 1.1 Ingestion Pipeline
**Trigger:** MQTT Broker publishes message to topic `raw/ecg/+`.

1.  **Listener:** `app/services/mqtt/client.py`
    *   Function: `MQTTClientService._handle_message(message)`
    *   Action: Decodes JSON, detects new devices (calls `notify_device_list_update`), and invokes the protocol parser.
2.  **Parsing:** `app/services/mqtt/protocol.py`
    *   Function: `MQTTProtocol.parse_packet(payload)`
    *   Action: Validates packet structure, extracts samples (Lead I, II, V1), and sequence counters.
3.  **Processing:** `app/services/mqtt/handler.py`
    *   Function: `MQTTDataHandler.process_samples(device_id, samples, ...)`
    *   Action:
        *   Updates `DeviceState.last_seen`.
        *   Manages Jitter Buffer: `_handle_jitter_buffer()`.
        *   Routes to specific sub-handlers: `_process_single_sample()`.

### 1.2 Live WebSocket Broadcast
**Trigger:** Inside `MQTTDataHandler.process_samples`.

1.  **Throttling:** `app/services/mqtt/handler.py`
    *   Function: `_broadcast_live_data(state, sample)`
    *   Logic: Checks `UI_BROADCAST_THROTTLE` (send 1 every 5 samples).
2.  **Broadcasting:** `app/services/device/state.py`
    *   Function: `DeviceStateManager.broadcast_to_device(device_id, type, data)`
    *   Action: Iterates through active `WebSocket` connections in `self.websocket_connections[device_id]` and sends JSON.
3.  **Frontend Reception:** `app/static/js/services/Socket.js`
    *   Event: `socket.onmessage` -> `type: "live_data"`
    *   Action: Emits `EVENTS.CHART.ECG_DATA`.
4.  **Rendering:** `app/static/js/modules/monitor/MonitorController.js`
    *   Component: `ChartManager.updateECG(data)`.

---

## 2. Recording Management
*Flow for starting, stopping, and saving recording sessions.*

### 2.1 Start Recording (User Action)
**Trigger:** User clicks "Start Rec" in UI.

1.  **Frontend Request:** `app/static/js/services/Socket.js`
    *   Function: `sendJson({ type: "start_recording", ... })`
2.  **API Handling:** `app/api/v1/endpoints/websocket.py`
    *   Function: `websocket_endpoint` (Main Loop)
    *   Match: `data["type"] == WSMessageType.START_RECORDING`
    *   Action: Parses patient data, creates `Session` in DB via `SessionRepository`, sets `state.is_recording = True`.
3.  **Confirmation:** Server broadcasts `WSMessageType.STATE_UPDATE` to all clients.

### 2.2 Data Persistence (Background)
**Trigger:** `MQTTDataHandler._process_single_sample` while `state.is_recording == True`.

1.  **Buffering:** `app/services/mqtt/handler.py`
    *   Function: `_store_recording_data()`
    *   Action: Appends sample to `device_state_manager.buffer_recording_batch`.
2.  **Batch Write:** `app/main.py` (Lifespan Event Loop) or `app/services/device/state.py`
    *   *Note: Database writes happen periodically via background task consuming the buffer.*

---

## 3. Disconnection & Error Handling (Watchdog)
*Critical flow for detecting lost devices and resetting UI state.*

### 3.1 Device Timeout Detection
**Trigger:** `app/services/device/watchdog.py` background task (Runs every 0.5s).

1.  **Check Loop:** `DeviceWatchdogService._check_all_devices()`
    *   Logic: Iterates all known devices. Calculates `time_since_last_seen`.
2.  **Threshold Check:**
    *   **Offline (> 1.0s):** Sends `WSMessageType.DEVICE_STATUS_UPDATE` (Red Dot).
    *   **Disconnected (> 2.0s):** Triggers Cleanup Sequence.
3.  **Disconnection Sequence:**
    *   **Capture State:** Stores `was_recording = state.is_recording`.
    *   **Notify UI:** Calls `device_state_manager.broadcast_to_device()`
        *   Type: `WSMessageType.DEVICE_DISCONNECTED`
        *   Payload: `{ device_id, reason: "Timeout", was_recording: true/false }`
    *   **Cancel Recording:** Calls `_cancel_device_recording()` if active.
    *   **Cleanup:** Calls `_cleanup_device()` (Removes from memory).

### 3.2 Frontend Handling
**Trigger:** WebSocket message `device_disconnected`.

1.  **Router:** `app/static/js/services/Socket.js`
    *   Action: Emits global event `EVENTS.DEVICE.DISCONNECTED`.
2.  **Handler:** `app/static/js/modules/monitor/MonitorController.js`
    *   Function: `handleDeviceDisconnection(data)`
    *   Logic:
        *   **Reset UI:** Calls `this.selectDevice("")` -> Clears Dropdown & Charts.
        *   **Alert:** Checks `data.was_recording`. If true, shows `alert("Recording Stopped...")`.
        *   **Toast:** If not recording, shows `Toast.show("Device disconnected")`.
        *   **Data Safety:** If patient data exists, it is **PRESERVED** (not nullified) to allow reconnection.

---

## 4. ML Analysis Pipeline
*Asynchronous classification of ECG segments.*

### 4.1 Triggering Analysis
**Trigger:** `MQTTDataHandler` accumulates `BUFFER_SIZE` samples (e.g., 1000 samples).

1.  **Segment Completion:** `app/services/mqtt/handler.py`
    *   Function: `_complete_segment(state)`
    *   Action: Calls `ml_engine_service.trigger_analysis()`.
2.  **Execution (Thread Pool):** `app/services/analysis/ml_engine.py`
    *   Function: `trigger_analysis` -> `_analyze_recording`
    *   Steps:
        1.  `_fetch_raw_data`: Reads from DB (`RawDataRepository`).
        2.  `_extract_features_from_data`: Calls `app/services/analysis/feature_extractor.py`.
        3.  `_predict`: Uses `tensorflow.keras.models.load_model` and `scaler.transform`.
        4.  `_save_results`: Updates DB via `SessionRepository`.
3.  **Result Broadcast:**
    *   Function: `_broadcast_result`
    *   Action: Sends `WSMessageType.LIVE_RESULT` to UI.

---

## 5. Frontend Architecture (Vanilla JS)
*Modular structure without frameworks.*

*   **Entry Point:** `app/static/js/app.js` -> `main.js` (Bootstraps Controllers).
*   **State Management:** `app/static/js/core/State.js` (Singleton `store` pattern).
*   **Event Bus:** `app/static/js/core/Events.js` (Pub/Sub pattern for decoupling).
*   **Communication:** `app/static/js/services/Socket.js` (WebSocket Wrapper).
*   **Visualization:** `app/static/js/shared/Charts.js` (U-Plot Wrapper).

### Key Controllers
*   `MonitorController.js`: Handles the main Live ECG page interactions.
*   `HistoryController.js`: Manages the archive/history table and modal views.
*   `AuthController.js`: Handles Login/Register logic.
