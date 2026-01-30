'use client';

import { useStore } from '@/store/useStore';
import clsx from 'clsx';
import { User, Activity, History } from 'lucide-react';

interface PatientSectionProps {
    variant?: 'default' | 'minimal';
}

export default function PatientSection({ variant = 'default' }: PatientSectionProps) {
    // 1. Hooks & State
    const { user } = useStore();

    // 2. Conditional Render: Loading
    if (!user) {
        return (
            <div className={clsx(
                "h-full flex items-center justify-center",
                variant === 'default' && "bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 p-8"
            )}>
                <div className="flex flex-col items-center gap-3">
                    <Activity className="w-8 h-8 text-slate-200 animate-pulse" />
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Synchronizing Profile...</p>
                </div>
            </div>
        );
    }

    const containerClass = variant === 'minimal' 
        ? "flex items-center justify-between h-full px-1" 
        : "bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 px-8 py-5 h-full flex flex-col justify-center group hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] transition-all duration-500 relative overflow-hidden";

    // 3. Main Render
    return (
        <div className={containerClass}>
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-slate-900 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <User size={120} strokeWidth={1} />
            </div>
            
            <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-md flex items-center justify-center shadow-sm border border-teal-100/50">
                            <User size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Active Session</p>
                            <p className="text-[9px] font-bold text-teal-500 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                <span className="w-1 h-1 bg-teal-500 rounded-full"></span>
                                Clinical Profile
                            </p>
                        </div>
                    </div>
                    
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none truncate group-hover:text-brand-600 transition-colors duration-300">
                        {user.full_name || user.username}
                    </h3>
                </div>
                
                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-md flex items-center gap-2 shadow-sm">
                        <History size={10} className="text-slate-400" strokeWidth={3} />
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider truncate max-w-[180px]">
                            {user.medical_history || 'No History'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
