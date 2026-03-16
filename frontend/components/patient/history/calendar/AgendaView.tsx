'use client';

import { AnalysisResult } from '@/types/models';
import { Activity, ChevronRight, Clock, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { TimePickerField } from './parts/TimePickerField';
import { AgendaResultItem } from './parts/AgendaResultItem';

interface AgendaViewProps {
    results: AnalysisResult[];
    onResultClick: (result: AnalysisResult) => void;
    startTime: string;
    endTime: string;
    onStartTimeChange: (val: string) => void;
    onEndTimeChange: (val: string) => void;
    loading?: boolean;
    currentDate: Date;
    onPrevDay: () => void;
    onNextDay: () => void;
    onResetTime: () => void;
    filters: {
        highRisk: boolean;
        potential: boolean;
        abnormal: boolean;
    };
    onFilterChange: (filters: { highRisk: boolean; potential: boolean; abnormal: boolean }) => void;
}

export default function AgendaView({ 
    results, 
    onResultClick,
    startTime,
    endTime,
    onStartTimeChange,
    onEndTimeChange,
    loading,
    currentDate,
    onPrevDay,
    onNextDay,
    onResetTime,
    filters
}: AgendaViewProps) {
    const filteredResults = results.filter(r => {
        const cls = r.classification?.toLowerCase().trim() || '';
        if (cls === 'normal') return false;
        const isHigh = cls.includes('sangat berpotensi');
        const isPot = !isHigh && cls.includes('berpotensi');
        const isAbn = !isHigh && !isPot; 
        if (isHigh) return filters.highRisk;
        if (isPot) return filters.potential;
        if (isAbn) return filters.abnormal;
        return false;
    });

    const formattedDate = currentDate.toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const isDefaultFilter = startTime === "00:00:00" && endTime === "23:59:59";

    return (
        <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500 pb-10 relative">
            <div className="sticky top-0 z-30 px-4 sm:px-6 py-2 bg-white/90 backdrop-blur-md border-b border-slate-100 transition-all">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50/50 p-1 rounded-lg border border-slate-100 flex-1 h-12 2xl:h-16">
                        <div className="hidden lg:flex items-center gap-2 px-3 border-r border-slate-200 shrink-0 h-full">
                            <Clock size={14} className="text-blue-500 2xl:w-5 2xl:h-5" strokeWidth={2.5} />
                            <span className="text-[8px] 2xl:text-[10px] font-black text-slate-500 uppercase tracking-widest">Filters</span>
                        </div>
                        <div className="flex items-center gap-2 flex-1 pl-1">
                            <TimePickerField 
                                label="From" 
                                value={startTime} 
                                onChange={onStartTimeChange} 
                                compact={true}
                            />
                            <div className="text-[10px] 2xl:text-xs font-black text-slate-300 uppercase tracking-widest px-1">
                                TO
                            </div>
                            <TimePickerField 
                                label="To" 
                                value={endTime} 
                                onChange={onEndTimeChange} 
                                compact={true}
                            />
                            <button 
                                onClick={onResetTime}
                                disabled={isDefaultFilter}
                                className={clsx(
                                    "ml-1 p-2 border rounded-md transition-all shadow-sm group",
                                    isDefaultFilter 
                                        ? "bg-slate-50 border-slate-100 text-slate-200 cursor-not-allowed" 
                                        : "bg-white border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 active:scale-95 cursor-pointer"
                                )}
                                title={isDefaultFilter ? "Filters at default" : "Reset Time Filter"}
                            >
                                <RotateCcw size={14} className={clsx(!isDefaultFilter && "group-hover:rotate-[-45deg] transition-transform")} />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50/80 p-1 rounded-lg border border-slate-100 flex-1 h-12 2xl:h-16">
                        <div className="flex items-center justify-between flex-1">
                            <button 
                                onClick={onPrevDay}
                                className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-400 hover:text-blue-600 transition-all active:scale-90 group flex items-center gap-2 cursor-pointer"
                            >
                                <ChevronRight size={14} className="rotate-180 transition-transform group-hover:-translate-x-0.5" />
                                <span className="text-[8px] 2xl:text-[10px] font-black uppercase tracking-widest hidden xl:block">Prev</span>
                            </button>
                            <div className="flex flex-col items-center px-4">
                                <h2 className="text-[11px] 2xl:text-[13px] font-black text-slate-800 tracking-tight whitespace-nowrap">{formattedDate}</h2>
                            </div>
                            <button 
                                onClick={onNextDay}
                                className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-400 hover:text-blue-600 transition-all active:scale-90 group flex items-center gap-2 cursor-pointer"
                            >
                                <span className="text-[8px] 2xl:text-[10px] font-black uppercase tracking-widest hidden xl:block">Next</span>
                                <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="relative flex-1 min-h-[400px]">
                {loading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-40 z-20 bg-white/50 backdrop-blur-[1px]">
                        <div className="animate-spin text-blue-500">
                            <Clock size={48} strokeWidth={2.5} />
                        </div>
                        <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Syncing precision logs...</span>
                    </div>
                )}
                <div className="flex flex-col gap-6 h-full px-4 sm:px-6">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 2xl:w-10 2xl:h-10 bg-blue-600 text-white rounded-md flex items-center justify-center font-black text-xs shadow-lg shadow-blue-100">
                                {filteredResults.length}
                            </div>
                            <div>
                                <h3 className="text-base 2xl:text-xl font-black text-slate-800 tracking-tight">Clinical Records</h3>
                                <p className="text-[9px] 2xl:text-xs font-bold text-slate-400 uppercase tracking-widest">Detected abnormalities for this period</p>
                            </div>
                        </div>
                    </div>
                    {filteredResults.length === 0 && !loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 animate-in fade-in duration-700">
                            <div className="w-20 h-20 bg-slate-50 rounded-md flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
                                <Activity size={40} className="text-slate-200" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tight text-center">Tidak ada data potensi atau abnormal di sini</h3>
                            <p className="text-[10px] text-slate-400 mt-2 max-w-xs text-center uppercase tracking-[0.2em] font-black leading-relaxed">Sesuaikan rentang waktu atau pilih tanggal lain</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredResults.map((result) => (
                                <AgendaResultItem 
                                    key={result.recording_id} 
                                    result={result} 
                                    onClick={onResultClick} 
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}