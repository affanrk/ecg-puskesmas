'use client';

import { globalEventBus } from './events';
import { EVENTS } from '@/config/constants';
import { useStore, Device } from '@/store/useStore';
import { useToast } from '@/hooks/useToast';

type SocketMessage =
    | { type: 'ping' | 'pong' }
    | { type: 'device_list_update'; devices: Device[] }
    | { type: 'live_data'; device_id?: string; cal_lead_I: number; cal_lead_II: number; cal_lead_III: number; cal_avF: number; cal_v1: number; counter?: number }
    | { type: 'live_batch'; device_id?: string; samples: Array<{ i: number; ii: number; iii: number; avf: number; v1: number }>; counter?: number; sampling_rate?: number }
    | { type: 'live_result'; device_id: string; classification: string; confidence?: number; recording_id?: string }
    | { type: 'state_update'; device_id?: string; is_recording: boolean }
    | { type: 'performance_update'; device_id?: string; latency_ms: number; jitter_ms: number; packet_loss_pct: number }
    | { type: 'live_metrics_update'; device_id?: string; data: { bpm: number } }
    | { type: 'device_disconnected'; device_id: string }
    | { type: 'error'; message: string };

class WebSocketService {
    private socket: WebSocket | null = null;
    private reconnectInterval = 2000;
    private maxReconnectInterval = 30000;
    private pingInterval: NodeJS.Timeout | null = null;
    private pingTimeout: NodeJS.Timeout | null = null;

    private getWsUrl(): string {
        const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const port = '8080';
        const defaultUrl = `${protocol}//${host}:${port}/ws`;
        
        const env = (typeof window !== 'undefined' ? (window as { __ENV__?: Record<string, string> }).__ENV__ : null) || {};
        let finalUrl = env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_WS_URL || defaultUrl;

        if (!finalUrl.startsWith('ws://') && !finalUrl.startsWith('wss://')) {
            const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss://' : 'ws://';
            finalUrl = `${wsProtocol}${finalUrl}`;
        }

        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && finalUrl.startsWith('ws://')) {
            finalUrl = finalUrl.replace('ws://', 'wss://');
        }

        const token = typeof window !== 'undefined' ? localStorage.getItem('ecg_token') : null;
        if (token) {
            finalUrl += (finalUrl.includes('?') ? '&' : '?') + `token=${token}`;
        }

        return finalUrl;
    }

    public connect() {
        if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
            return;
        }
        const url = this.getWsUrl();
        this.socket = new WebSocket(url);
        this.socket.onopen = this.handleOpen.bind(this);
        this.socket.onmessage = this.handleMessage.bind(this);
        this.socket.onclose = this.handleClose.bind(this);
        this.socket.onerror = this.handleError.bind(this);
    }

    public disconnect() {
        this.stopHeartbeat();
        if (this.socket) {
            this.socket.onclose = null;
            this.socket.close();
            this.socket = null;
        }
        useStore.getState().setIsConnected(false);
    }

    public reconnect() {
        this.disconnect();
        setTimeout(() => this.connect(), 500);
    }

    private handleOpen() {
        globalEventBus.emit(EVENTS.WS.CONNECTED);
        useStore.getState().setIsConnected(true);
        this.reconnectInterval = 2000;
        this.startHeartbeat();
    }

    private handleMessage(event: MessageEvent) {
        try {
            const msg = JSON.parse(event.data) as SocketMessage;
            this.processMessage(msg);
        } catch (e) {
            console.error("[WS] Parse Error:", e);
        }
    }

    private handleClose() {
        this.stopHeartbeat();
        globalEventBus.emit(EVENTS.WS.DISCONNECTED);
        useStore.getState().setIsConnected(false);
        this.socket = null;
        setTimeout(() => this.connect(), this.reconnectInterval);
        this.reconnectInterval = Math.min(this.reconnectInterval * 2, this.maxReconnectInterval);
    }

    private handleError(error: Event) {
        console.error("[WS] Error:", error);
        this.socket?.close();
    }

    private startHeartbeat() {
        this.stopHeartbeat();
        this.pingInterval = setInterval(() => {
            this.sendJson({ type: 'ping' });
            this.pingTimeout = setTimeout(() => {
                this.socket?.close();
            }, 5000);
        }, 10000);
    }

    private stopHeartbeat() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        if (this.pingTimeout) clearTimeout(this.pingTimeout);
    }

    private processMessage(msg: SocketMessage) {
        const store = useStore.getState();
        const { show: toast } = useToast.getState();
        if (msg.type === "pong") {
            if (this.pingTimeout) clearTimeout(this.pingTimeout);
            return;
        }
        if (msg.type === "ping") {
            this.sendJson({ type: "pong" });
            return;
        }
        if (msg.type === "device_list_update") {
            store.setDevices(msg.devices);
            globalEventBus.emit(EVENTS.DEVICE.LIST_UPDATED, msg.devices);
            return;
        }
        if ('device_id' in msg && msg.device_id) {
            const isDataMessage = ['live_data', 'live_batch', 'live_result', 'live_metrics_update', 'performance_update'].includes(msg.type);
            if (isDataMessage) {
                if (!store.currentDeviceId || msg.device_id !== store.currentDeviceId) return;
            } else {
                if (store.currentDeviceId && msg.device_id !== store.currentDeviceId) return;
            }
        }
        switch (msg.type) {
            case "live_data": {
                const point = { leadI: msg.cal_lead_I, leadII: msg.cal_lead_II, leadIII: msg.cal_lead_III, avF: msg.cal_avF, v1: msg.cal_v1, counter: msg.counter };
                store.pushEcgData([point]);
                globalEventBus.emit(EVENTS.CHART.ECG_DATA, point);
                break;
            }
            case "live_batch": {
                if (msg.samples?.length) {
                    const batchData = msg.samples.map(s => ({
                        leadI: s.i, leadII: s.ii, leadIII: s.iii, avF: s.avf, v1: s.v1
                    }));
                    store.pushEcgData(batchData);
                    globalEventBus.emit(EVENTS.CHART.ECG_BATCH, { samples: batchData, counter: msg.counter, sampling_rate: msg.sampling_rate });
                }
                break;
            }
            case "live_result": {
                store.addLiveResult({
                    timestamp: new Date().toISOString(),
                    device_id: msg.device_id,
                    subject_id: store.user?.nik || store.user?.id || "-",
                    patient_name: store.user?.full_name || store.user?.username || "-",
                    classification: msg.classification,
                    confidence: msg.confidence,
                    recording_id: msg.recording_id || `live_${Date.now()}`
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
            case "state_update":
                store.setRecording(msg.is_recording);
                break;
            case "performance_update":
                store.updatePerformance(msg.latency_ms, msg.jitter_ms, msg.packet_loss_pct);
                globalEventBus.emit(EVENTS.STATE.PERFORMANCE_UPDATED, {
                    latency_ms: msg.latency_ms, jitter_ms: msg.jitter_ms, loss_pct: msg.packet_loss_pct
                });
                break;
            case "device_disconnected":
                globalEventBus.emit(EVENTS.DEVICE.DISCONNECTED, { device_id: msg.device_id });
                break;
            case "error":
                console.error("[WS] Server Error:", msg.message);
                if (msg.message.toLowerCase().includes("session expired")) {
                    const { isRecording, currentDeviceId } = store;
                    if (isRecording && currentDeviceId) {
                        this.sendJson({ type: "stop_recording", device_id: currentDeviceId });
                    }
                    
                    localStorage.removeItem('ecg_token');
                    localStorage.removeItem('ecg_user');
                    store.setUser(null);
                    window.location.href = '/login?reason=expired';
                } else {
                    toast(msg.message, "error");
                }
                break;
        }
    }

    public sendJson(data: Record<string, unknown>) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.warn("[WS] Cannot send, socket not open:", data);
        }
    }
}

const wsService = new WebSocketService();
export const connectWebSocket = () => wsService.connect();
export const disconnectWebSocket = () => wsService.disconnect();
export const reconnectWebSocket = () => wsService.reconnect();
export const sendJson = (data: Record<string, unknown>) => wsService.sendJson(data);
export default wsService;
