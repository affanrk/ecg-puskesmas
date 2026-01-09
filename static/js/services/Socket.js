import { CONFIG, EVENTS } from '../config.js';
import { globalEventBus } from '../core/Events.js';
import { store } from '../core/State.js';

let socket = null;
let reconnectInterval = 2000;
let watchdogTimer = null;

export function connectWebSocket() {
    socket = new WebSocket(CONFIG.WS_URL);

    socket.onopen = () => {
        globalEventBus.emit(EVENTS.WS.CONNECTED);
        reconnectInterval = 2000;
    };

    socket.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            handleMessage(msg);
        } catch (e) {
            console.error("[WS] Parse Error:", e);
        }
    };

    socket.onclose = () => {
        globalEventBus.emit(EVENTS.WS.DISCONNECTED);

        // Coba connect ulang (Exponential Backoff)
        setTimeout(connectWebSocket, reconnectInterval);
        reconnectInterval = Math.min(reconnectInterval * 2, 30000);
    };

    socket.onerror = (error) => {
        console.error("[WS] Error:", error);
        socket.close();
    };
}

export function sendJson(data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
    }
}

function handleMessage(msg) {
    // 1. Update Device List (Global, tidak peduli device mana yang dipilih)
    if (msg.type === "device_list_update") {
        globalEventBus.emit(EVENTS.DEVICE.LIST_UPDATED, msg.devices);
        return;
    }

    // 2. Filter: Pastikan data ini untuk device yang sedang kita pilih
    if (msg.device_id && msg.device_id !== store.currentDeviceId) {
        return;
    }

    // 3. Routing berdasarkan tipe pesan
    switch (msg.type) {
        case "live_data":
            // Payload: { leadI, leadII, v1 }
            globalEventBus.emit(EVENTS.CHART.ECG_DATA, {
                leadI: msg.cal_lead_I,
                leadII: msg.cal_lead_II,
                v1: msg.cal_v1
            });
            resetWatchdog();
            break;

        case "live_result":
            store.addLiveResult({
                timestamp: new Date().toISOString(),
                device_id: msg.device_id,
                subject_id: store.patient?.nik || "-",
                patient_name: store.patient?.name || "-",
                classification: msg.classification,
                confidence: msg.confidence,
                recording_id: msg.recording_id || ('live_' + Date.now())
            });
            break;

        case "state_update":
            // Status Recording & Data Pasien
            store.setRecordingState(msg.is_recording);

            if (msg.patient_name) {
                store.setPatientData({
                    nik: msg.subject_id,
                    name: msg.patient_name,
                    age: msg.patient_age,
                    gender: msg.patient_gender,
                    riwayat: msg.patient_riwayat || 'Normal',
                    dob: msg.tanggal_lahir,
                    pob: msg.tempat_lahir
                });
            } else if (!msg.is_recording && !msg.patient_name) {
            }
            break;

        case "performance_update":
            store.updatePerformance(msg.latency_ms, msg.jitter_ms, msg.packet_loss_pct);
            break;

        case "live_metrics_update":
            globalEventBus.emit(EVENTS.CHART.METRICS, msg.data);
            break;

        case "error":
            const errorEvent = new CustomEvent('app:error', { detail: msg.message });
            window.dispatchEvent(errorEvent);
            break;
    }
}

function resetWatchdog() {

    if (watchdogTimer) clearTimeout(watchdogTimer);

    watchdogTimer = setTimeout(() => {

        if (store.currentDeviceId) {

            // Watchdog: No data received

        }

    }, 3000);

}
