'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { sendJson } from '@/services/socket';
import { useToast } from '@/hooks/useToast';

export function useSessionManager() {
    const { isRecording, currentDeviceId, user, selectedLeadMode, operatorPatient } = useStore();
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
            const payload: Record<string, string | number | undefined> = {
                type: "start_recording",
                device_id: currentDeviceId,
                user_id: user.id,
                username: user.username,
                subject_id: operatorPatient ? operatorPatient.id : user.id,
                lead_mode: selectedLeadMode,
                source: operatorPatient ? `${user.operator_profile?.id || user.id} - ${user.operator_profile?.full_name || user.username}` : "WEB"
            };
            
            if (operatorPatient) {
                payload.patient_id = operatorPatient.id;
            }
            
            sendJson(payload);
        }
    };

    return {
        toggleRecording
    };
}
