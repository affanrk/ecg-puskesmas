'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { sendJson } from '@/services/socket';
import { useToast } from '@/hooks/useToast';

export function useSessionManager() {
    const { isRecording, currentDeviceId, user, selectedLeadMode } = useStore();
    const { show: toast } = useToast();

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isRecording) {
                e.preventDefault();
                e.returnValue = '';
                return ''
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isRecording]);

    const toggleRecording = () => {
        if (!currentDeviceId) {
            toast("No device selected", "error");
            return;
        }

        if (isRecording) {
            useStore.getState().setWsPendingAction('stopping');
            sendJson({ type: "stop_recording", device_id: currentDeviceId });
        } else {
            if (!user) {
                toast("Session error. Please login again.", "error");
                return;
            }

            useStore.getState().setWsPendingAction('starting');
            const payload = {
                type: "start_recording",
                device_id: currentDeviceId,
                user_id: user.id,
                username: user.username,
                subject_id: user.id,
                lead_mode: selectedLeadMode
            };
            sendJson(payload);
        }
    };

    return {
        toggleRecording
    };
}
