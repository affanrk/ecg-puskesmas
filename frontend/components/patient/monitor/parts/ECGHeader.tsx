'use client';

import React from 'react';
import { Activity } from 'lucide-react';
import clsx from 'clsx';
import { getActiveProfile } from '@/utils/helpers';
import { User } from '@/types/user';

interface ECGHeaderProps {
    user: User | null;
    selectedLeadMode: 5 | 12;
    onModeSwitch: (mode: 5 | 12) => void;
}

export const ECGHeader = React.memo(function ECGHeader({ user, selectedLeadMode, onModeSwitch }: ECGHeaderProps) {
    const activeProfile = getActiveProfile(user);
    const fullName = (activeProfile?.full_name || "") || user?.username || 'Unknown';
    const medicalHistory = (activeProfile?.medical_history || "") || 'No Prior Records';

    return (
        <div className="h-[45px] flex items-center justify-between px-6 border-b border-slate-100 bg-white relative z-20 shrink-0">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-2 pr-6 border-r border-slate-100">
                    <Activity size={14} className="text-rose-500 animate-pulse" />
                    <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-tight">Monitoring</h3>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">
                            {fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-800 leading-none">
                                {fullName}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Patient Identity</span>
                        </div>
                    </div>
                    <div className="w-px h-6 bg-slate-100" />
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Medical History:</span>
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                {medicalHistory}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 w-[140px]">
                    <div 
                        className={clsx(
                            "absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-white rounded shadow-sm transition-transform duration-300 ease-in-out",
                            selectedLeadMode === 12 ? "translate-x-0" : "translate-x-[calc(100%+2px)]"
                        )} 
                    />
                    <button
                        onClick={() => onModeSwitch(12)}
                        className={clsx("relative z-10 flex-1 py-1 rounded text-[10px] font-bold transition-colors duration-300 cursor-pointer", selectedLeadMode === 12 ? "text-slate-800" : "text-slate-400 hover:text-slate-600")}
                    >
                        12 LEADS
                    </button>                    <button 
                        onClick={() => onModeSwitch(5)} 
                        className={clsx("relative z-10 flex-1 py-1 rounded text-[10px] font-bold transition-colors duration-300 cursor-pointer", selectedLeadMode === 5 ? "text-slate-800" : "text-slate-400 hover:text-slate-600")}
                    >
                        5 LEADS
                    </button>
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-300 uppercase tracking-[0.2em] hidden sm:block">ECG Digital Stream</span>
            </div>
        </div>
    );
});
