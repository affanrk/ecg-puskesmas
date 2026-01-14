'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { useSessionManager } from '@/hooks/useSessionManager';
import { calculateAge } from '@/utils/helpers';
import clsx from 'clsx';
import { UserPlus, Play, Square, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

interface PatientSectionProps {
    onNewSession: () => void;
}

export default function PatientSection({ onNewSession }: PatientSectionProps) {
    const { patient, isRecording, currentDeviceId } = useStore();
    const { toggleRecording, handleResetSession: resetSess } = useSessionManager();
    const { show: toast } = useToast();

    const onNewSessionClick = () => {
        if (!currentDeviceId) {
            toast("Select a device first", "error");
            return;
        }
        onNewSession();
    };

    const onToggleRecording = () => {
        if (!currentDeviceId) {
            toast("No device selected", "error");
            return;
        }
        toggleRecording();
        toast(isRecording ? "Capture stopped" : "Recording started", isRecording ? "warning" : "success");
    };

    const onResetSession = () => {
        resetSess();
    };

    if (!patient) {
        // Initial View: No Active Session
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center h-full relative overflow-hidden">
                <div className="flex items-center justify-between w-full gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 text-2xl">
                            📇
                        </div>
                        <div>
                            <h4 className="text-base font-bold text-slate-800">No Active Session</h4>
                            <p className="text-xs text-slate-500">Input data to start analysis.</p>
                        </div>
                    </div>
                    <button 
                        onClick={onNewSessionClick}
                        className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2.5 px-5 rounded-lg shadow-sm shadow-brand-200 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <UserPlus className="w-4 h-4" />
                        New Session
                    </button>
                </div>
            </div>
        );
    }

    // Patient Info View
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-center h-full relative overflow-hidden">
            <div className="flex justify-between items-center h-full">
                {/* Info */}
                <div className="flex-1 space-y-1.5 pr-4">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-800 truncate max-w-[220px] leading-tight">
                            {patient.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200 font-bold uppercase tracking-wide">
                            {patient.gender === 'L' ? 'M' : 'F'}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                        <span className="flex items-center gap-1.5">
                            <span className="text-slate-400">ID:</span> 
                            <span className="font-semibold text-slate-600">{patient.nik}</span>
                        </span>
                        <span className="w-px h-3 bg-slate-300"></span>
                        <span className="flex items-center gap-1.5">
                            <span className="text-slate-400">Age:</span> 
                            <span className="font-semibold text-slate-600">{patient.age} Th</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400">History:</span>
                        <span className="font-bold text-slate-700">{patient.riwayat || 'Normal'}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-2 justify-center h-full pl-4 border-l border-slate-100">
                    <button 
                        onClick={onToggleRecording}
                        className={clsx(
                            "text-white text-xs font-bold py-2 px-4 rounded-lg shadow-sm transition-all active:scale-95 w-28 flex justify-center items-center gap-2",
                            isRecording ? "bg-slate-700 hover:bg-slate-800" : "bg-emerald-500 hover:bg-emerald-600"
                        )}
                    >
                        {isRecording ? (
                            <>
                                <div className="w-1.5 h-1.5 bg-white rounded-sm animate-pulse" /> Stop
                            </>
                        ) : (
                            <>
                                Start Rec
                            </>
                        )}
                    </button>
                    <button 
                        onClick={onResetSession}
                        className="text-[10px] font-bold text-slate-400 hover:text-rose-500 py-1 transition-colors"
                    >
                        End Session
                    </button>
                </div>
            </div>
        </div>
    );
}
