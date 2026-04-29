'use client';

import React from 'react';

import clsx from 'clsx';
import { Activity, User as UserIcon } from 'lucide-react';

import { WalkinPatient } from '@/types/user';

interface OperatorECGHeaderProps {

    operatorPatient: WalkinPatient | null;
    selectedLeadMode: 5 | 12;
    onModeSwitch: (mode: 5 | 12) => void;
    onSelectPatientClick: () => void;
    isSessionLocked?: boolean;
}

export const OperatorECGHeader = React.memo(function OperatorECGHeader({ 

    operatorPatient, 
    selectedLeadMode, 
    onModeSwitch,
    onSelectPatientClick,
    isSessionLocked = false
}: OperatorECGHeaderProps) {
    const fullName = operatorPatient ? operatorPatient.full_name : "No Subject Selected";

    const isReady = !!operatorPatient;

    return (
        <div className="h-[45px] flex items-center justify-between px-6 border-b border-slate-100 bg-white relative z-20 shrink-0">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-2 pr-6 border-r border-slate-100">
                    <Activity size={14} className={clsx(isReady ? "text-rose-500 animate-pulse" : "text-slate-300")} />
                    <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-tight">Operator Mode</h3>
                </div>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={isSessionLocked ? undefined : onSelectPatientClick}
                        className={clsx(
                            "flex items-center gap-3 px-3 py-1 border rounded-md transition-colors group",
                            isSessionLocked
                                ? "bg-amber-50 border-amber-200 cursor-not-allowed opacity-80"
                                : clsx(
                                    "bg-slate-50 hover:bg-slate-100 border-slate-200 cursor-pointer",
                                    !operatorPatient && "animate-pulse shadow-sm shadow-indigo-100 border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                                )
                        )}
                        title={isSessionLocked ? 'End session first to change patient' : undefined}
                    >
                        <div className={clsx(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black",
                            isSessionLocked
                                ? "bg-amber-100 text-amber-700 border border-amber-200"
                                : operatorPatient ? "bg-indigo-100 text-indigo-600 border border-indigo-200" : "bg-slate-200 text-slate-400"
                        )}>
                            {operatorPatient ? fullName.charAt(0).toUpperCase() : <UserIcon size={12} />}
                        </div>
                        <div className="flex flex-col text-left">
                            <span className={clsx("text-[11px] font-black leading-none", isSessionLocked ? "text-amber-800" : operatorPatient ? "text-slate-800" : "text-indigo-600")}>
                                {fullName}
                            </span>
                            <span className={clsx("text-[9px] font-bold uppercase tracking-widest mt-0.5 transition-colors", isSessionLocked ? "text-amber-600" : "text-slate-400 group-hover:text-indigo-500")}>
                                {isSessionLocked ? 'Session Active' : (operatorPatient ? 'Change Patient' : 'Select Patient Context')}
                            </span>
                        </div>
                    </button>
                    
                    {operatorPatient && (
                        <>
                            <div className="w-px h-6 bg-slate-100" />
                            <div className="flex flex-col justify-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">NIK:</span>
                                    <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                        {operatorPatient.nik || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
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
                    </button>                    
                    <button 
                        onClick={() => onModeSwitch(5)} 
                        className={clsx("relative z-10 flex-1 py-1 rounded text-[10px] font-bold transition-colors duration-300 cursor-pointer", selectedLeadMode === 5 ? "text-slate-800" : "text-slate-400 hover:text-slate-600")}
                    >
                        5 LEADS
                    </button>
                </div>
            </div>
        </div>
    );
});
