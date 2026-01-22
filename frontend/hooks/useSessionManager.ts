'use client';

import { useStore } from '@/store/useStore';
import { sendJson } from '@/services/socket';
import { useToast } from '@/hooks/useToast';

export function useSessionManager() {
    // 1. Store & Hooks
    const { isRecording, currentDeviceId, user } = useStore();
    const { show: toast } = useToast();

    // 2. Actions
    const toggleRecording = () => {
        if (!currentDeviceId) {
            toast("No device selected", "error");
            return;
        }

        if (isRecording) {
            sendJson({ type: "stop_recording", device_id: currentDeviceId });
        } else {
            if (!user) {
                toast("Session error. Please login again.", "error");
                return;
            }

            const payload = {
                type: "start_recording",
                device_id: currentDeviceId,
                user_id: user.id, // ID is int
                username: user.username,
                subject_id: String(user.id) // Fallback for components expecting subject_id
            };
            sendJson(payload);
        }
    };

    return {
        toggleRecording
    };
}