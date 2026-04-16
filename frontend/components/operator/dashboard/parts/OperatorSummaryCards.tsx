'use client';

import { User, Clock, Stethoscope, Database } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { getActiveProfile } from '@/utils/helpers';

interface OperatorSummaryCardsProps {
    dashboardData: {
        operator_name?: string | null;
        operator_role?: string | null;
        work_location?: string | null;
        str_number?: string | null;
        total_recorded: number;
        arrhythmia_count: number;
    } | null;
    lastSyncTime: {
        date: string;
        time: string;
    };
}

export default function OperatorSummaryCards({ dashboardData, lastSyncTime }: OperatorSummaryCardsProps) {
    const user = useStore(state => state.user);
    if (!user) return null;

    const profile = getActiveProfile(user);
    const displayName = dashboardData?.operator_name || profile?.full_name || user.username;

    return (
        <div className="bg-white px-8 pt-6 pb-6 2xl:px-10 2xl:pt-8 2xl:pb-8 transition-all duration-500 relative overflow-hidden group w-full flex flex-col">
            <div className="absolute -right-2 -bottom-2 opacity-[0.02] text-slate-900 pointer-events-none transition-transform duration-700 group-hover:scale-110">
                <Stethoscope size={100} strokeWidth={1} />
            </div>
            <div className="relative z-10 space-y-4 2xl:space-y-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 2xl:w-14 2xl:h-14 bg-slate-50 text-slate-400 rounded-md flex items-center justify-center shadow-inner border border-slate-100 shrink-0">
                        <User size={20} className="2xl:w-7 2xl:h-7" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg 2xl:text-xl font-black text-slate-800 truncate tracking-tight leading-none mb-1 flex items-center gap-2">
                            {displayName}
                            {dashboardData?.str_number && (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] 2xl:text-[10px] uppercase tracking-widest border border-slate-200 font-mono">
                                    STR: {dashboardData.str_number}
                                </span>
                            )}
                        </h3>
                        <p className="text-[9px] 2xl:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] truncate">
                            {dashboardData?.operator_role || 'Medical Staff'}
                            {dashboardData?.work_location && ` • ${dashboardData.work_location}`}
                        </p>
                    </div>
                </div>
                <div className="h-px bg-slate-50 w-full" />
                <div className="grid grid-cols-1 gap-2 2xl:gap-3">
                    <div className="flex items-center justify-between p-2 2xl:p-3 rounded-md bg-slate-50/50 border border-slate-100/50 group-hover:bg-white transition-colors duration-500">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 2xl:w-10 2xl:h-10 bg-rose-500 text-white rounded flex items-center justify-center shadow-sm">
                                <Database size={14} strokeWidth={3} className="2xl:w-5 2xl:h-5" />
                            </div>
                            <span className="text-[9px] 2xl:text-[10px] font-black text-slate-500 uppercase tracking-widest">Arrhythmia Cases</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs 2xl:text-base font-black tracking-tight text-rose-600">
                                {dashboardData?.total_recorded ?? 0}
                                <span className="text-slate-300 font-bold ml-1 text-[10px]">cases</span>
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-2 2xl:p-3 rounded-md bg-slate-50/50 border border-slate-100/50 group-hover:bg-white transition-colors duration-500">
                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 2xl:w-10 2xl:h-10 bg-blue-500 text-white rounded flex items-center justify-center shadow-sm">
                                <Clock size={14} strokeWidth={3} className="2xl:w-5 2xl:h-5" />
                            </div>
                            <span className="text-[9px] 2xl:text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Sync</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-xs 2xl:text-base font-black text-slate-700 tracking-tight font-mono">
                                {lastSyncTime.time || '--:--:--'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
