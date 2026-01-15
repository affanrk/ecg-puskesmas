'use client';

import { useStore } from '@/store/useStore';
import { sendJson } from '@/services/socket';

import { useToast } from '@/hooks/useToast';

export function useSessionManager() {
    const { isRecording, currentDeviceId, patient, resetSession } = useStore();
    const { show: toast } = useToast();

    const toggleRecording = () => {
        if (!currentDeviceId) {
            toast("No device selected", "error");
            return;
        }

        if (isRecording) {
            sendJson({ type: "stop_recording", device_id: currentDeviceId });
        } else {
            if (!patient) {
                toast("No active session. Please start a new session first.", "error");
                return;
            }

            const payload = {
                type: "start_recording",
                device_id: currentDeviceId,
                subject_id: patient.nik,
                patient_name: patient.name,
                umur: patient.age,
                jenis_kelamin: patient.gender,
                tanggal_lahir: patient.dob,
                tempat_lahir: patient.pob,
                riwayat_penyakit: patient.riwayat
            };
            sendJson(payload);
        }
    };

    const handleResetSession = () => {
        if (isRecording) {
            toast("Stop recording first.", "error");
            return;
        }
        if (!confirm("End current session? All data will be reset.")) return;

        resetSession();
    };

    return {
        toggleRecording,
        handleResetSession
    };
}
