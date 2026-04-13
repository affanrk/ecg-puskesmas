'use client';

import { useState, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useSessionManager } from '@/hooks/useSessionManager';
import { useDeviceManager } from '@/hooks/useDeviceManager';
import { useToast } from '@/hooks/useToast';
import ConfirmationModal from '@/components/shared/ConfirmationModal';

import { OperatorECGHeader } from './OperatorECGHeader';
import { ECGFooter } from '@/components/patient/monitor/parts/ECGFooter';
import { ECGMonitor } from '@/components/patient/monitor/parts/ECGMonitor';
import PatientSelectorModal from './PatientSelectorModal';
import OperatorDeviceDropdown from './OperatorDeviceDropdown';

export default function OperatorECGChart() {

    const operatorPatient = useStore(state => state.operatorPatient);
    const currentDeviceId = useStore(state => state.currentDeviceId);
    const isRecording = useStore(state => state.isRecording);
    const isSessionActive = useStore(state => state.isSessionActive);
    const selectedLeadMode = useStore(state => state.selectedLeadMode);
    const setSelectedLeadMode = useStore(state => state.setSelectedLeadMode);
    const resetSession = useStore(state => state.resetSession);
    const wsPendingAction = useStore(state => state.wsPendingAction);

    const { toggleRecording } = useSessionManager();
    const { disconnectDevice } = useDeviceManager();
    const { show: toast } = useToast();

    const [showConfirmReset, setShowConfirmReset] = useState(false);
    const [isEnding, setIsEnding] = useState(false);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);

    const handleReset = useCallback(() => {
        if (isRecording) return;
        setShowConfirmReset(true);
    }, [isRecording]);

    const handleToggleRecording = useCallback(() => {
        if (!operatorPatient) {
            toast("Please select a patient context first before starting the recording.", "error");
            setIsSelectorOpen(true);
            return;
        }
        toggleRecording();
    }, [toggleRecording, operatorPatient, toast]);

    const handleSelectPatient = useCallback(() => {
        if (isSessionActive) {
            toast("End the current session before changing the patient.", "warning");
            return;
        }
        setIsSelectorOpen(true);
    }, [isSessionActive, toast]);

    const confirmReset = useCallback(async () => {
        setIsEnding(true);
        if (currentDeviceId) {
            disconnectDevice();
        }
        resetSession();
        setIsEnding(false);
        setShowConfirmReset(false);
    }, [currentDeviceId, disconnectDevice, resetSession]);

    const handleModeSwitch = useCallback((mode: 5 | 12) => {
        if (selectedLeadMode === mode) return;

        if (isSessionActive || isRecording || wsPendingAction) {
            toast("Wait for active processes or end session first before switching lead modes.", "warning");
            return;
        }
        
        const storeState = useStore.getState();
        const storeBuffer = selectedLeadMode === 12 ? storeState.ecgBuffer12Leads : storeState.ecgBuffer5Leads;
        if (currentDeviceId || storeBuffer.length > 0) {
            if (currentDeviceId) {
                disconnectDevice();
            }
            resetSession();
        }
        
        setSelectedLeadMode(mode);
    }, [selectedLeadMode, isSessionActive, isRecording, wsPendingAction, currentDeviceId, disconnectDevice, resetSession, setSelectedLeadMode, toast]);

    return (
        <div className="flex flex-col w-full h-full bg-white relative transition-all duration-500">
            <OperatorECGHeader 

                operatorPatient={operatorPatient}
                selectedLeadMode={selectedLeadMode} 
                onModeSwitch={handleModeSwitch} 
                onSelectPatientClick={handleSelectPatient}
                isSessionLocked={isSessionActive}
            />
            
            <ECGMonitor 
                selectedLeadMode={selectedLeadMode} 
            />
            
            <ECGFooter
                currentDeviceId={currentDeviceId}
                isSessionActive={isSessionActive}
                isRecording={isRecording}
                wsPendingAction={wsPendingAction}
                isEnding={isEnding}
                onToggleRecording={handleToggleRecording}
                onReset={handleReset}
                deviceDropdownSlot={<OperatorDeviceDropdown />}
            />

            <ConfirmationModal
                isOpen={showConfirmReset}
                onClose={() => setShowConfirmReset(false)}
                onConfirm={confirmReset}
                title="End Session?"
                message="Are you sure you want to end this session? All unsaved data will be cleared and the device will be disconnected from the current patient context."
                confirmText="End Session"
                isDestructive={true}
                isLoading={isEnding}
            />
            
            <PatientSelectorModal 
                isOpen={isSelectorOpen} 
                onClose={() => setIsSelectorOpen(false)} 
            />
        </div>
    );
}
