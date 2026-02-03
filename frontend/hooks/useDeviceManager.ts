'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { globalEventBus } from '@/services/events';
import { EVENTS } from '@/config/constants';
import { sendJson } from '@/services/socket';
import { useToast } from '@/hooks/useToast';

export interface Device {
    id: string;
    is_locked: boolean;
}

export function useDeviceManager() {
    const { currentDeviceId, setDeviceId, isRecording, setRecording, devices, setBpm } = useStore();
    const { show: toast } = useToast();

    useEffect(() => {
        const handleDeviceList = (list: Device[]) => {
            if (currentDeviceId) {
                const exists = list.some(d => d.id === currentDeviceId);
                if (!exists) {
                    handleDeviceDisconnect({ device_id: currentDeviceId, was_recording: isRecording });
                }
            }
        };

        const handleDeviceDisconnect = (data: { device_id?: string; was_recording?: boolean } | string) => {
            const disconnectedId = typeof data === 'string' ? data : data.device_id;
            if (disconnectedId !== currentDeviceId) return;

            const wasRecording = isRecording || (typeof data !== 'string' && data.was_recording);

            setDeviceId(null); 
            setBpm('--');

            if (wasRecording) {
                setRecording(false); 
                toast(`Recording PAUSED! Device ${disconnectedId} lost connection. Select another device to continue.`, "error");
            } else {
                toast(`Device ${disconnectedId} disconnected`);
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

    const selectDevice = (deviceId: string) => {
        if (deviceId === currentDeviceId) return;

        if (isRecording) {
            sendJson({ type: "stop_recording", device_id: currentDeviceId });
            setRecording(false);
        }

        if (currentDeviceId) {
            sendJson({ type: "unsubscribe" });
        }

        setDeviceId(deviceId);

        if (deviceId) {
            sendJson({ type: "subscribe_to_device", device_id: deviceId });
        }
    };

    const disconnectDevice = () => {
        if (!currentDeviceId) return;

        if (isRecording) {
            sendJson({ type: "stop_recording", device_id: currentDeviceId });
            setRecording(false);
        }
        
        sendJson({ type: "unsubscribe" });
        
        setDeviceId(null); 
        setBpm('--');
        
        toast("Disconnected from device");
    };

    return {
        devices,
        currentDeviceId,
        selectDevice,
        disconnectDevice
    };
}
