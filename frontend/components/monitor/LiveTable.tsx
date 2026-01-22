'use client';

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { CONFIG } from '@/config/constants';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Activity, Clock } from 'lucide-react';

export default function LiveTable() {
    // 1. Hooks & State
    const { liveData, livePage, setLivePage, isRecording } = useStore();
    
    // 2. Computed
    const rowsPerPage = CONFIG.ROWS_PER_PAGE_LIVE || 5;
    const totalPages = Math.ceil(liveData.length / rowsPerPage) || 1;
    
    // 3. Effects
    // Auto adjust page if out of bounds
    useEffect(() => {
        if (livePage > totalPages) setLivePage(1);
    }, [liveData.length, livePage, totalPages, setLivePage]);

    // 4. Helpers
    const start = (livePage - 1) * rowsPerPage;
    const paginatedData = liveData.slice(start, start + rowsPerPage);

    const changePage = (delta: number) => {
        const newPage = livePage + delta;
        if (newPage >= 1 && newPage <= totalPages) {
            setLivePage(newPage);
        }
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleString('en-GB', { 
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false
        });
    };

    // 5. Render
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            {/* Header Toolbar */}
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                <div className="flex items-center gap-2">
                    <Activity size={16} className="text-brand-600" />
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Analysis Log</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-slate-50 px-2 py-1 border border-slate-100 rounded-md text-slate-500 font-bold uppercase tracking-wider">
                        {liveData.length} Records
                    </span>
                </div>
            </div>

            {/* Table Area */}
            <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <table className="w-full text-left border-collapse table-fixed">
                    <thead className="bg-slate-50/80 text-slate-500 sticky top-0 z-10 backdrop-blur-sm">
                        <tr className="text-[10px] uppercase text-slate-400 font-extrabold tracking-widest border-b border-slate-100">
                            <th className="px-6 py-2.5 w-[30%]">Time</th>
                            <th className="px-6 py-2.5 w-[20%]">NIK</th>
                            <th className="px-6 py-2.5 w-[30%]">Name</th>
                            <th className="px-6 py-2.5 w-[20%] text-center">Result</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center">
                                    <div className="flex flex-col items-center gap-2 opacity-40">
                                        <Clock size={24} strokeWidth={1.5} />
                                        <p className="text-xs font-medium text-slate-500">
                                            {isRecording ? "Waiting for analysis..." : "No data available"}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((rec, idx) => {
                                const status = (rec.classification || '').toString();
                                const isAbnormal = ['Abnormal', 'Aritmia', 'Berpotensi'].some(x => status.includes(x));
                                const isRecording = status === 'Recording...';

                                return (
                                    <tr 
                                        key={rec.recording_id || `${rec.timestamp}-${idx}`} 
                                        className="hover:bg-slate-50 transition-colors h-[42px] group"
                                    >
                                        <td className="px-6 font-mono font-medium text-slate-600 truncate text-xs">
                                            {formatTime(rec.changed_dt || rec.timestamp)}
                                        </td>
                                        <td className="px-6 font-mono font-medium text-slate-600 truncate text-xs">{rec.subject_id}</td>
                                        <td className="px-6 font-bold text-slate-700 truncate text-xs">{rec.patient_name}</td>
                                        <td className="px-6 text-center">
                                            <span className={clsx(
                                                "inline-flex items-center rounded-md px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset uppercase tracking-wide",
                                                status === 'Normal' ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
                                                isAbnormal ? "bg-rose-50 text-rose-700 ring-rose-200" :
                                                isRecording ? "bg-blue-50 text-blue-700 ring-blue-200 animate-pulse" :
                                                "bg-slate-50 text-slate-600 ring-slate-200"
                                            )}>
                                                {isRecording && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-ping"></span>}
                                                {status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-5 py-2 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">
                <div className="flex items-center gap-1">
                    <span>Page</span>
                    <span className="text-slate-700 font-extrabold">{livePage}</span>
                    <span>/</span>
                    <span className="text-slate-700 font-extrabold">{totalPages}</span>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => changePage(-1)}
                        disabled={livePage <= 1}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={() => changePage(1)}
                        disabled={livePage >= totalPages}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
