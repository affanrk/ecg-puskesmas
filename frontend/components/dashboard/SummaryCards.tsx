'use client';

import { User, Clock, Activity } from 'lucide-react';
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
    isVertical?: boolean;
}

export default function SummaryCards({ lastResult, lastResultTime }: SummaryCardsProps) {
    const { user } = useStore();
    
    if (!user) return null;

    const isNormal = lastResult?.classification === 'Normal';
    const cardClass = "bg-white px-8 pt-6 pb-6 2xl:px-10 2xl:pt-8 2xl:pb-8 transition-all duration-500 relative overflow-hidden group h-full w-full flex flex-col";

    return (
        <div className={cardClass}>
            <div className="absolute -right-2 -bottom-2 opacity-[0.02] text-slate-900 pointer-events-none transition-transform duration-700 group-hover:scale-110">
                <User size={100} strokeWidth={1} />
            </div>

            <div className="relative z-10 space-y-4 2xl:space-y-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 2xl:w-14 2xl:h-14 bg-slate-50 text-slate-400 rounded-md flex items-center justify-center shadow-inner border border-slate-100 shrink-0">
                        <User size={20} className="2xl:w-7 2xl:h-7" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg 2xl:text-xl font-black text-slate-800 truncate tracking-tight leading-none mb-1">
                            {user.full_name || user.username}
                        </h3>
                        <p className="text-[9px] 2xl:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] truncate">
                            {user.gender === 'L' ? 'Male' : 'Female'} • {user.dob ? calculateAge(user.dob) : 'N/A'} YEARS OLD
                        </p>
                    </div>
                </div>

                <div className="h-px bg-slate-50 w-full" />

                <div className="grid grid-cols-1 gap-2 2xl:gap-3">
                    <div className="flex items-center justify-between p-2 2xl:p-3 rounded-md bg-slate-50/50 border border-slate-100/50 group-hover:bg-white transition-colors duration-500">
                        <div className="flex items-center gap-3">
                            <div className={clsx(
                                "w-7 h-7 2xl:w-10 2xl:h-10 rounded flex items-center justify-center transition-colors shadow-sm",
                                !lastResult ? "bg-slate-100 text-slate-300" :
                                isNormal ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                            )}>
                                <Activity size={14} strokeWidth={3} className="2xl:w-5 2xl:h-5" />
                            </div>
                            <span className="text-[9px] 2xl:text-[10px] font-black text-slate-500 uppercase tracking-widest">Latest Result</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={clsx(
                                "text-xs 2xl:text-base font-black tracking-tight",
                                !lastResult ? "text-slate-300" :
                                isNormal ? "text-emerald-600" : "text-rose-600"
                            )}>
                                {lastResult?.classification || 'Waiting...'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-2 2xl:p-3 rounded-md bg-slate-50/50 border border-slate-100/50 group-hover:bg-white transition-colors duration-500">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 2xl:w-10 2xl:h-10 bg-blue-500 text-white rounded flex items-center justify-center shadow-sm">
                                <Clock size={14} strokeWidth={3} className="2xl:w-5 2xl:h-5" />
                            </div>
                            <span className="text-[9px] 2xl:text-[10px] font-black text-slate-500 uppercase tracking-widest">Sync Activity</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xs 2xl:text-base font-black text-slate-700 tracking-tight font-mono">
                                {lastResultTime.time || '--:--:--'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
