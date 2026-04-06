'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { globalEventBus } from '@/services/events';
import { EVENTS } from '@/config/constants';
import { sendJson } from '@/services/socket';
import { useToast } from '@/hooks/useToast';
import { Device } from '@/types/models';

export function useDeviceListeners() {
    const { currentDeviceId, setDeviceId, isRecording, setRecording, setBpm, resetSession } = useStore();
    const { show: toast } = useToast();

    useEffect(() => {
        const handleReconnection = () => {
            if (currentDeviceId) {
                sendJson({ type: "subscribe_to_device", device_id: currentDeviceId });
            }
        };

        const handleWsDisconnect = () => {
            const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
            const { isSessionActive, setIsConnected } = useStore.getState();
            
            setIsConnected(false);

            setRecording(false);

            if (isRecording) {
                toast(isOffline ? "Network Lost: Recording Auto-Paused" : "Server Connection Lost: Recording Paused", "error");
            } else if (currentDeviceId) {
                toast(isOffline ? "Network Lost: Live stream paused. Waiting for connection..." : "Server Disconnected: Reconnecting...", "warning");
                
                if (!isSessionActive) {
                    resetSession();
                }
            }

            setBpm('--');
            setDeviceId(null);
            
            useStore.setState({ ecgBuffer5Leads: [], ecgBuffer12Leads: [] });
        };

        globalEventBus.on(EVENTS.WS.CONNECTED, handleReconnection);
        globalEventBus.on(EVENTS.WS.DISCONNECTED, handleWsDisconnect);

        window.addEventListener('offline', handleWsDisconnect);

        return () => {
            globalEventBus.off(EVENTS.WS.CONNECTED, handleReconnection);
            globalEventBus.off(EVENTS.WS.DISCONNECTED, handleWsDisconnect);
            window.removeEventListener('offline', handleWsDisconnect);
        };
    }, [currentDeviceId, isRecording, setDeviceId, setRecording, toast, setBpm, resetSession]);
}
