import { globalEventBus } from './events';
import { EVENTS } from '../config/constants';
import { useStore } from '../store/useStore';
import { useToast } from '@/hooks/useToast';

let socket: WebSocket | null = null;
let reconnectInterval = 2000;

const getWsUrl = () => {
    if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = '5000';
    return `${protocol}//${host}:${port}/ws`;
};

export const connectWebSocket = () => {
    const WS_URL = getWsUrl();
    
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        if (socket.readyState === WebSocket.OPEN) {
            useStore.getState().setIsConnected(true);
        }
        return;
    }

    if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.close();
    }

    console.log("[WS] Connecting to:", WS_URL);
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
        console.log("[WS] Connection opened");
        globalEventBus.emit(EVENTS.WS.CONNECTED);
        useStore.getState().setIsConnected(true);
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

    socket.onclose = (event) => {
        console.log("[WS] Connection closed:", event.code, event.reason);
        globalEventBus.emit(EVENTS.WS.DISCONNECTED);
        useStore.getState().setIsConnected(false);
        
        setTimeout(connectWebSocket, reconnectInterval);
        reconnectInterval = Math.min(reconnectInterval * 2, 30000);
        socket = null;
    };

    socket.onerror = (error) => {
        console.error("[WS] Error:", error);
        socket?.close();
    };
};

export const sendJson = (data: any) => {
    const toast = useToast.getState().show;
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
    } else {
        console.warn("WebSocket not ready, cannot send:", data);
        toast("Connection lost. Cannot send data.", "error");
    }
};

let watchdogTimer: NodeJS.Timeout | null = null;

function resetWatchdog() {
    if (watchdogTimer) clearTimeout(watchdogTimer);
    
    watchdogTimer = setTimeout(() => {
        const store = useStore.getState();
        if (store.currentDeviceId) {
        }
    }, 3000);
}

function handleMessage(msg: any) {
    const store = useStore.getState();
    const toast = useToast.getState().show;

    // Heartbeat
    if (msg.type === "ping") {
        sendJson({ type: "pong", timestamp: Date.now() });
        return;
    }

    // 1. Update Device List (Global)
    if (msg.type === "device_list_update") {
        useStore.getState().setDevices(msg.devices);
        globalEventBus.emit(EVENTS.DEVICE.LIST_UPDATED, msg.devices);
        return;
    }

    // 2. Filter: Ensure data is for selected device
    if (msg.device_id && msg.device_id !== store.currentDeviceId) {
        return;
    }

    // 3. Routing based on type
    switch (msg.type) {
        case "live_data":
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
            store.setRecording(msg.is_recording);

            if (msg.patient_name) {
                store.setPatient({
                    nik: msg.subject_id,
                    name: msg.patient_name,
                    age: msg.patient_age,
                    gender: msg.patient_gender,
                    riwayat: msg.patient_riwayat || 'Normal',
                    dob: msg.tanggal_lahir,
                    pob: msg.tempat_lahir
                });
            }
            break;

        case "performance_update":
            store.updatePerformance(msg.latency_ms, msg.jitter_ms, msg.packet_loss_pct);
            globalEventBus.emit(EVENTS.STATE.PERFORMANCE_UPDATED, {
                latency_ms: msg.latency_ms,
                jitter_ms: msg.jitter_ms,
                loss_pct: msg.packet_loss_pct
            });
            break;

        case "live_metrics_update":
            if (msg.data && msg.data.bpm) {
                store.setBpm(Math.round(msg.data.bpm));
            }
            globalEventBus.emit(EVENTS.CHART.METRICS, msg.data);
            break;

        case "device_disconnected":
            globalEventBus.emit(EVENTS.DEVICE.DISCONNECTED, {
                device_id: msg.device_id
            });
            break;

        case "error":
            console.error("Server Error:", msg.message);
            toast(msg.message, "error");
            break;
    }
}
