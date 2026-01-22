'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { useSessionManager } from '@/hooks/useSessionManager';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import clsx from 'clsx';
import { Square, Activity, WifiOff, XCircle } from 'lucide-react';

interface PatientSectionProps {
    variant?: 'default' | 'minimal';
}

export default function PatientSection({ variant = 'default' }: PatientSectionProps) {
    // 1. Hooks & State
    const { user, isRecording, isSessionActive, currentDeviceId, resetSession } = useStore();
    const { toggleRecording } = useSessionManager();
    const [showConfirmReset, setShowConfirmReset] = useState(false);

    // 2. Conditional Render: Loading
    if (!user) {
        return (
            <div className={clsx(
                "h-full flex items-center justify-center",
                variant === 'default' && "bg-white rounded-xl shadow-sm border border-slate-200 p-4"
            )}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Patient Data...</p>
            </div>
        );
    }

    // 3. Handlers
    const handleReset = () => {
        if (isRecording) return; 
        setShowConfirmReset(true);
    };

    const confirmReset = () => {
        resetSession();
        setShowConfirmReset(false);
    };

    const containerClass = variant === 'minimal' 
        ? "flex items-center justify-between h-full px-1" 
        : "bg-white rounded-xl shadow-sm border border-slate-200 p-5 h-full flex items-center justify-between group hover:border-blue-300 transition-colors";

    // 4. Main Render
    return (
        <div className={containerClass}>
            <div className="flex-1 min-w-0 pr-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Patient</p>
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-black text-slate-900 truncate tracking-tight">{user.full_name || user.username}</h3>
                </div>
                <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Medical History</span>
                        <span className="text-sm font-semibold text-slate-600 truncate block" title={user.medical_history || ''}>{user.medical_history || '-'}</span>
                    </div>
                </div>
            </div>
            
            <div className={clsx("flex flex-col items-center justify-center gap-2 pl-6 border-l shrink-0 min-w-[160px]", variant === 'minimal' ? "border-slate-200" : "border-slate-100")}>
                {currentDeviceId ? (
                    <>
                        <div className="flex flex-col items-center">
                            <div className="flex items-center gap-1.5">
                                <span className={clsx("w-2 h-2 rounded-full", isRecording ? "bg-rose-500 animate-pulse" : "bg-emerald-500")}></span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{currentDeviceId}</span>
                            </div>
                        </div>
                        
                        {!isSessionActive ? (
                            <button 
                                onClick={toggleRecording}
                                className="flex items-center gap-2 px-6 h-9 rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 justify-center uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20 w-full"
                            >
                                <Activity size={14} /> Record
                            </button>
                        ) : (
                            <div className="flex gap-2 w-full">
                                {isRecording ? (
                                    <button 
                                        onClick={toggleRecording}
                                        className="flex-1 flex items-center gap-2 px-4 h-9 rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 justify-center uppercase tracking-wider bg-rose-600 text-white hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-600/20"
                                    >
                                        <Square size={12} fill="currentColor" /> Stop
                                    </button>
                                ) : (
                                    <button 
                                        onClick={toggleRecording}
                                        className="flex-1 flex items-center gap-2 px-4 h-9 rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 justify-center uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20"
                                    >
                                        <Activity size={12} /> Rec
                                    </button>
                                )}
                                
                                <button 
                                    onClick={handleReset}
                                    disabled={isRecording}
                                    className={clsx(
                                        "flex-1 flex items-center justify-center px-4 h-9 rounded-lg text-xs font-bold border transition-all uppercase tracking-wider",
                                        isRecording 
                                            ? "bg-slate-50 text-slate-300 cursor-not-allowed border-slate-100" 
                                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 shadow-sm active:scale-95"
                                    )}
                                >
                                    <XCircle size={14} /> End
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    // DEVICE DISCONNECTED SCENARIOS
                    isSessionActive ? (
                        <>
                            <div className="flex flex-col items-center text-slate-400">
                                <span className="text-[10px] font-bold uppercase tracking-wider">Paused</span>
                            </div>
                            <button 
                                onClick={handleReset}
                                className="flex items-center gap-2 px-6 h-9 rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 justify-center uppercase tracking-wider bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 w-full"
                            >
                                <XCircle size={14} /> End Session
                            </button>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-300 gap-2 px-4">
                            <WifiOff size={18} />
                            <span className="text-xs font-bold uppercase tracking-wider">No Device</span>
                        </div>
                    )
                )}
            </div>

            <ConfirmationModal
                isOpen={showConfirmReset}
                onClose={() => setShowConfirmReset(false)}
                onConfirm={confirmReset}
                title="End Session?"
                message="Are you sure you want to end this session? All unsaved data will be cleared and the device will be disconnected from the current patient context."
                confirmText="End Session"
                isDestructive={true}
            />
        </div>
    );
}