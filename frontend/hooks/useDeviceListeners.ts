'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { globalEventBus } from '@/services/events';
import { EVENTS } from '@/config/constants';
import { sendJson } from '@/services/socket';
import { useToast } from '@/hooks/useToast';
import { Device } from './useDeviceManager';

export function useDeviceListeners() {
    const { currentDeviceId, setDeviceId, isRecording, setRecording, setBpm } = useStore();
    const { show: toast } = useToast();
    const isDisconnectingRef = useRef(false);
    const prevDeviceIdRef = useRef(currentDeviceId);

    useEffect(() => {
        if (prevDeviceIdRef.current !== currentDeviceId) {
            isDisconnectingRef.current = false;
            prevDeviceIdRef.current = currentDeviceId;
        }

        const handleDeviceDisconnect = (data: { device_id?: string; was_recording?: boolean } | string, silent: boolean = false) => {
            const disconnectedId = typeof data === 'string' ? data : data.device_id;
            if (disconnectedId !== currentDeviceId) return;
            if (isDisconnectingRef.current) return;
            isDisconnectingRef.current = true;
            const wasRecording = isRecording || (typeof data !== 'string' && data.was_recording);
            setDeviceId(null); 
            setBpm('--');
            if (!silent) {
                if (wasRecording) {
                    setRecording(false); 
                    toast(`Recording PAUSED! Device ${disconnectedId} lost connection. Select another device to continue.`, "error");
                } else {
                    toast(`Device ${disconnectedId} disconnected`);
                }
            }
        };

        const handleDeviceList = (list: Device[]) => {
            if (currentDeviceId) {
                const exists = list.some(d => d.id === currentDeviceId);
                if (!exists) {
                    handleDeviceDisconnect({ device_id: currentDeviceId, was_recording: isRecording }, true);
                }
            }
        };

        const handleReconnection = () => {
            if (currentDeviceId) {
                sendJson({ type: "subscribe_to_device", device_id: currentDeviceId });
            }
        };

        globalEventBus.on(EVENTS.DEVICE.LIST_UPDATED, handleDeviceList);
        globalEventBus.on(EVENTS.DEVICE.DISCONNECTED, handleDeviceDisconnect);
        globalEventBus.on(EVENTS.WS.CONNECTED, handleReconnection);

        return () => {
            globalEventBus.off(EVENTS.DEVICE.LIST_UPDATED, handleDeviceList);
            globalEventBus.off(EVENTS.DEVICE.DISCONNECTED, handleDeviceDisconnect);
            globalEventBus.off(EVENTS.WS.CONNECTED, handleReconnection);
        };
    }, [currentDeviceId, isRecording, setDeviceId, setRecording, toast, setBpm]);
}
