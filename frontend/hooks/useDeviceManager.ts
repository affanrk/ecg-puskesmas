'use client';

import { useStore } from '@/store/useStore';
import { sendJson } from '@/services/socket';
import { useToast } from '@/hooks/useToast';

export function useDeviceManager() {
    const currentDeviceId = useStore(state => state.currentDeviceId);
    const setDeviceId = useStore(state => state.setDeviceId);
    const isRecording = useStore(state => state.isRecording);
    const devices = useStore(state => state.devices);
    const setBpm = useStore(state => state.setBpm);
    const setWsPendingAction = useStore(state => state.setWsPendingAction);
    const { show: toast } = useToast();

    const selectDevice = (deviceId: string) => {
        if (deviceId === currentDeviceId) return;

        if (isRecording) {
            setWsPendingAction('switching');
            sendJson({ type: "stop_recording", device_id: currentDeviceId });
        } else {
            setWsPendingAction('switching');
        }

        if (currentDeviceId) {
            sendJson({ type: "unsubscribe" });
        }

        if (deviceId) {
            sendJson({ type: "subscribe_to_device", device_id: deviceId });
        }
    };

    const disconnectDevice = () => {
        if (!currentDeviceId) return;

        if (isRecording) {
            setWsPendingAction('disconnecting');
            sendJson({ type: "stop_recording", device_id: currentDeviceId });
        } else {
            setWsPendingAction('disconnecting');
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
