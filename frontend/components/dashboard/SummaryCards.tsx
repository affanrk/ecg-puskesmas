'use client';

import { User, Clock, Activity, HeartPulse } from 'lucide-react';
import clsx from 'clsx';
import { calculateAge } from '@/utils/helpers';
import { useStore } from '@/store/useStore';

interface SummaryCardsProps {
    lastResult: {
        classification?: string;
        confidence?: number;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any;
    } | null;
    lastResultTime: {
        date: string;
        time: string;
    };
}

export default function SummaryCards({ lastResult, lastResultTime }: SummaryCardsProps) {
    const { user } = useStore();
    const cardClass = "bg-white rounded-md shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 p-5 transition-all duration-500 relative overflow-hidden group";

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0">
            <div className={cardClass}>
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-slate-900 pointer-events-none transition-transform duration-700">
                    <User size={120} strokeWidth={1} />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-md flex items-center justify-center shadow-sm border border-teal-100/50">
                            <User size={18} strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Active User</span>
                    </div>
                    
                    {user ? (
                        <>
                            <h3 className="text-2xl font-black text-slate-800 truncate tracking-tight leading-tight mb-2">
                                {user.full_name || user.username}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-md flex items-center gap-2 shadow-sm">
                                    <User size={10} className="text-slate-400" strokeWidth={3} />
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider whitespace-nowrap">
                                        {user.gender === 'L' ? 'Male' : (user.gender ? 'Female' : 'N/A')} • {user.dob ? calculateAge(user.dob) + ' Years Old' : '-'}
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-slate-300 text-xs font-bold uppercase tracking-widest py-2 animate-pulse">Synchronizing...</div>
                    )}
                </div>
            </div>

            <div className={cardClass}>
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-blue-900 pointer-events-none transition-transform duration-700">
                    <Clock size={120} strokeWidth={1} />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-md flex items-center justify-center shadow-sm border border-blue-100/50">
                            <Clock size={18} strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">System Sync</span>
                    </div>
                    
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">
                            {lastResultTime.time || '--:--:--'}
                        </h3>
                    </div>
                    <p className="text-xs font-black text-blue-500 uppercase tracking-widest mt-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                        {lastResultTime.date}
                    </p>
                </div>
            </div>

            <div className={cardClass}>
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-rose-900 pointer-events-none transition-transform duration-700">
                    <Activity size={120} strokeWidth={1} />
                </div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={clsx(
                            "w-10 h-10 rounded-md flex items-center justify-center shadow-sm border transition-colors",
                            lastResult?.classification === 'Normal' ? "bg-emerald-50 text-emerald-600 border-emerald-100/50" : "bg-rose-50 text-rose-600 border-rose-100/50"
                        )}>
                            <Activity size={18} strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Latest Result</span>
                    </div>
                    
                    <h3 className={clsx(
                        "text-3xl font-black truncate tracking-tight flex items-center gap-2",
                        !lastResult ? "text-slate-300" :
                        lastResult.classification === 'Normal' ? "text-emerald-600" : "text-rose-600"
                    )}>
                        {lastResult?.classification || 'Waiting...'}
                        {lastResult?.classification === 'Normal' && <HeartPulse size={24} className="animate-pulse" />}
                    </h3>
                    
                    <div className="flex items-center gap-3 mt-4">
                        <div className="h-2 flex-1 bg-slate-100 rounded-md overflow-hidden p-0.5 border border-slate-50">
                            <div 
                                className={clsx("h-full rounded-md transition-all duration-1000", lastResult?.classification === 'Normal' ? "bg-emerald-500" : "bg-rose-500")}
                                style={{ width: `${(lastResult?.confidence || 0) * 100}%` }} 
                            />
                        </div>
                        <span className="text-xs font-black text-slate-600 uppercase">{( (lastResult?.confidence || 0) * 100 ).toFixed(0)}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
