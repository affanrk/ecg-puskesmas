'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { useSessionManager } from '@/hooks/useSessionManager';
import clsx from 'clsx';
import { UserPlus, Square, LogOut, User } from 'lucide-react';
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

    // --- EMPTY STATE ---
    if (!patient) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 text-slate-300 rounded-lg flex items-center justify-center border border-slate-100">
                        <User size={20} />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Active Patient</h4>
                        <p className="text-[10px] text-slate-400">Please start a new session</p>
                    </div>
                </div>
                <button 
                    onClick={onNewSessionClick}
                    className="bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold uppercase tracking-widest py-2 px-4 rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-2"
                >
                    <UserPlus className="w-3.5 h-3.5" />
                    New Session
                </button>
            </div>
        );
    }

    // --- ACTIVE PATIENT STATE ---
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-full flex items-center justify-between">
            
            {/* Left Section: Informative Data Grid */}
            <div className="flex-1 flex flex-col justify-center min-w-0 pr-4">
                {/* Header Row */}
                <div className="flex items-baseline gap-2 mb-3">
                    <h3 className="text-sm font-extrabold text-slate-800 truncate uppercase tracking-tight leading-none" title={patient.name}>
                        {patient.name}
                    </h3>
                    <span className={clsx(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded leading-none border uppercase tracking-tighter",
                        patient.gender === 'L' || patient.gender === 'Male'
                            ? "bg-blue-50 text-blue-600 border-blue-100" 
                            : "bg-pink-50 text-pink-600 border-pink-100"
                    )}>
                        {patient.gender === 'L' ? 'Male' : 'Female'}
                    </span>
                </div>

                {/* Data Grid: ID, Age, Med. History */}
                <div className="flex items-start gap-4">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-1.5">NIK/ID</span>
                        <span className="text-[11px] font-mono font-bold text-slate-700 leading-none">{patient.nik}</span>
                    </div>
                    <div className="w-px h-5 bg-slate-100 mt-1"></div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-1.5">Age</span>
                        <span className="text-[11px] font-bold text-slate-700 leading-none">{patient.age}Y</span>
                    </div>
                    <div className="w-px h-5 bg-slate-100 mt-1"></div>
                    <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-1.5">Med. History</span>
                        <span className="text-[11px] font-bold text-slate-700 leading-none truncate" title={patient.riwayat}>
                            {patient.riwayat || 'None Recorded'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right Section: Controls (Stacked Vertical) */}
            <div className="flex flex-col gap-2 pl-4 border-l border-slate-100 justify-center shrink-0">
                <button 
                    onClick={onToggleRecording}
                    className={clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm transition-all active:scale-95 min-w-[100px] justify-center uppercase tracking-widest border",
                        isRecording 
                            ? "bg-slate-800 border-slate-900 text-white hover:bg-black" 
                            : "bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600"
                    )}
                >
                    {isRecording ? (
                        <>
                            <Square size={10} fill="currentColor" /> Stop
                        </>
                    ) : (
                        <>
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div> Record
                        </>
                    )}
                </button>
                
                <button 
                    onClick={onResetSession}
                    className="flex items-center gap-1.5 px-3 py-1 text-[9px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all justify-center uppercase tracking-wider border border-transparent hover:border-rose-100"
                >
                    <LogOut size={12} />
                    End Session
                </button>
            </div>
        </div>
    );
}
