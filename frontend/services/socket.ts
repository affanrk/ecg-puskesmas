'use client';

import { globalEventBus } from './events';
import { EVENTS } from '@/config/constants';
import { useStore } from '@/store/useStore';
import { useToast } from '@/hooks/useToast';

// --- Types ---

declare global {
    interface Window {
        __ENV__?: Record<string, string>;
    }
}

// Define types for incoming WebSocket messages
type SocketMessage =
    | { type: 'ping' }
    | { type: 'device_list_update'; devices: any[] }
    | { type: 'live_data'; device_id?: string; cal_lead_I: number; cal_lead_II: number; cal_v1: number }
    | { type: 'live_batch'; device_id?: string; samples: Array<{ i: number; ii: number; v1: number }> }
    | { type: 'live_result'; device_id: string; classification: string; confidence?: number; recording_id?: string }
    | { type: 'state_update'; device_id?: string; is_recording: boolean }
    | { type: 'performance_update'; device_id?: string; latency_ms: number; jitter_ms: number; packet_loss_pct: number }
    | { type: 'live_metrics_update'; device_id?: string; data: { bpm: number } }
    | { type: 'device_disconnected'; device_id: string }
    | { type: 'error'; message: string };

// --- State ---

let socket: WebSocket | null = null;
let reconnectInterval = 2000;
let watchdogTimer: NodeJS.Timeout | null = null;

// --- Helpers ---

const getWsUrl = (): string => {
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const port = '8080';
    const defaultUrl = `${protocol}//${host}:${port}/ws`;

    let finalUrl;
    if (typeof window !== 'undefined' && (window as any).__ENV__) {
        finalUrl = (window as any).__ENV__.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_WS_URL || defaultUrl;
    } else {
        finalUrl = process.env.NEXT_PUBLIC_WS_URL || defaultUrl;
    }

    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && finalUrl.startsWith('ws://')) {
        finalUrl = finalUrl.replace('ws://', 'wss://');
    }

    return finalUrl;
};

const resetWatchdog = () => {
    if (watchdogTimer) clearTimeout(watchdogTimer);

    // Watchdog logic can be expanded here if needed to detect stalled streams
    watchdogTimer = setTimeout(() => {
        // Placeholder for future watchdog logic
    }, 3000);
};

// --- Message Handler ---

const handleMessage = (msg: SocketMessage) => {
    const store = useStore.getState();
    const { show: toast } = useToast.getState();

    // 1. System Messages
    if (msg.type === "ping") {
        sendJson({ type: "pong", timestamp: Date.now() });
        return;
    }

    if (msg.type === "device_list_update") {
        useStore.getState().setDevices(msg.devices);
        globalEventBus.emit(EVENTS.DEVICE.LIST_UPDATED, msg.devices);
        return;
    }

    // Filter: Ensure data is for selected device (if applicable to the message type)
    if ('device_id' in msg && msg.device_id) {
        // Exception: Allow 'device_disconnected' to pass even if we are in transition, 
        // but strictly block data types if no device is selected.
        const isDataMessage = ['live_data', 'live_batch', 'live_result', 'live_metrics_update'].includes(msg.type);

        if (isDataMessage) {
            if (!store.currentDeviceId || msg.device_id !== store.currentDeviceId) {
                return;
            }
        } else {
            // For other messages (like status updates), just check mismatch if we have a device
            if (store.currentDeviceId && msg.device_id !== store.currentDeviceId) {
                return;
            }
        }
    }

    // 2. Data Messages
    switch (msg.type) {
        case "live_data": {
            // Legacy single point - store in buffer AND emit
            const point = { leadI: msg.cal_lead_I, leadII: msg.cal_lead_II, v1: msg.cal_v1 };
            store.pushEcgData([point]);
            globalEventBus.emit(EVENTS.CHART.ECG_DATA, point);
            resetWatchdog();
            break;
        }

        case "live_batch": {
            if (msg.samples && Array.isArray(msg.samples)) {
                const batchData = msg.samples.map((s) => ({
                    leadI: s.i,
                    leadII: s.ii,
                    v1: s.v1
                }));

                // Store in global buffer for persistence
                store.pushEcgData(batchData);

                // Emit for chart animation
                globalEventBus.emit(EVENTS.CHART.ECG_BATCH, batchData);
                resetWatchdog();
            }
            break;
        }

        case "live_result": {
            store.addLiveResult({
                timestamp: new Date().toISOString(),
                device_id: msg.device_id,
                subject_id: store.user?.nik || (store.user?.id ? String(store.user.id) : "-"),
                patient_name: store.user?.full_name || store.user?.username || "-",
                classification: msg.classification,
                confidence: msg.confidence,
                recording_id: msg.recording_id || ('live_' + Date.now())
            });
            break;
        }

        case "live_metrics_update": {
            if (msg.data && typeof msg.data.bpm === 'number') {
                store.setBpm(Math.round(msg.data.bpm));
            }
            globalEventBus.emit(EVENTS.CHART.METRICS, msg.data);
            break;
        }

        case "state_update": {
            store.setRecording(msg.is_recording);
            break;
        }

        case "performance_update": {
            store.updatePerformance(msg.latency_ms, msg.jitter_ms, msg.packet_loss_pct);
            globalEventBus.emit(EVENTS.STATE.PERFORMANCE_UPDATED, {
                latency_ms: msg.latency_ms,
                jitter_ms: msg.jitter_ms,
                loss_pct: msg.packet_loss_pct
            });
            break;
        }

        case "device_disconnected": {
            globalEventBus.emit(EVENTS.DEVICE.DISCONNECTED, {
                device_id: msg.device_id
            });
            break;
        }

        case "error": {
            console.error("Server Error:", msg.message);
            toast(msg.message, "error");
            break;
        }
    }
};

// --- Exports ---

export const connectWebSocket = () => {
    const wsUrl = getWsUrl();

    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        if (socket.readyState === WebSocket.OPEN) {
            useStore.getState().setIsConnected(true);
        }
        return;
    }

    if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.close();
    }

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        globalEventBus.emit(EVENTS.WS.CONNECTED);
        useStore.getState().setIsConnected(true);
        reconnectInterval = 2000;
    };

    socket.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data) as SocketMessage;
            handleMessage(msg);
        } catch (e) {
            console.error("[WS] Parse Error:", e);
        }
    };

    socket.onclose = () => {
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

export const sendJson = (data: Record<string, unknown>) => {
    const { show: toast } = useToast.getState();
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
    } else {
        console.warn("WebSocket not ready, cannot send:", data);
        toast("Connection lost. Cannot send data.", "error");
    }
};