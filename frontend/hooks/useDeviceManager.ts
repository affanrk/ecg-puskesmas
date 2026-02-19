'use client';

import { useStore } from '@/store/useStore';
import { sendJson } from '@/services/socket';
import { useToast } from '@/hooks/useToast';

export interface Device {
    id: string;
    is_locked: boolean;
}

export function useDeviceManager() {
    const { currentDeviceId, setDeviceId, isRecording, setRecording, devices, setBpm } = useStore();
    const { show: toast } = useToast();

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
        toast("Disconnected from device", "warning");
    };

    return {
        devices,
        currentDeviceId,
        selectDevice,
        disconnectDevice
    };
}
