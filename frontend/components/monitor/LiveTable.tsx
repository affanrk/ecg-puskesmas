'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { CONFIG } from '@/config/constants';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Activity, Clock } from 'lucide-react';

export default function LiveTable() {
    const { liveData, livePage, setLivePage, patient } = useStore();
    
    const rowsPerPage = CONFIG.ROWS_PER_PAGE_LIVE || 5;
    const totalPages = Math.ceil(liveData.length / rowsPerPage) || 1;
    
    // Auto adjust page if out of bounds
    React.useEffect(() => {
        if (livePage > totalPages) setLivePage(1);
    }, [liveData.length, livePage, totalPages, setLivePage]);

    const start = (livePage - 1) * rowsPerPage;
    const paginatedData = liveData.slice(start, start + rowsPerPage);

    const changePage = (delta: number) => {
        const newPage = livePage + delta;
        if (newPage >= 1 && newPage <= totalPages) {
            setLivePage(newPage);
        }
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            {/* Header Toolbar */}
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <Activity size={14} className="text-blue-500" />
                    <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Analysis Log</h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-white px-2 py-0.5 border border-slate-200 rounded text-slate-500 font-bold uppercase tracking-tighter shadow-sm">
                        {liveData.length} Records
                    </span>
                </div>
            </div>

            {/* Table Area */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed">
                    <thead className="bg-slate-50">
                        <tr className="text-[10px] uppercase text-slate-400 font-bold tracking-widest h-10 border-b border-slate-100">
                            <th className="px-5 w-[20%]">Time</th>
                            <th className="px-5 w-[25%]">Patient ID</th>
                            <th className="px-5 w-[30%]">Name</th>
                            <th className="px-5 w-[25%] text-right">Result</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-2 opacity-30">
                                        <Clock size={24} />
                                        <p className="text-xs font-medium italic">
                                            {patient ? "Waiting for analysis stream..." : "No active session"}
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
                                        className="hover:bg-slate-50/50 transition-colors h-10 text-[11px] leading-none group animate-new-row"
                                    >
                                        <td className="px-5 font-mono font-bold text-slate-500">{formatTime(rec.timestamp)}</td>
                                        <td className="px-5 font-mono text-slate-500 truncate">{rec.subject_id}</td>
                                        <td className="px-5 font-bold text-slate-700 truncate">{rec.patient_name}</td>
                                        <td className="px-5 text-right">
                                            <span className={clsx(
                                                "inline-flex items-center rounded-md px-2 py-1 text-[9px] font-bold ring-1 ring-inset uppercase tracking-tighter",
                                                status === 'Normal' ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
                                                isAbnormal ? "bg-rose-50 text-rose-700 ring-rose-200" :
                                                isRecording ? "bg-blue-50 text-blue-700 ring-blue-200 animate-pulse" :
                                                "bg-slate-50 text-slate-600 ring-slate-200"
                                            )}>
                                                {isRecording && <span className="w-1 h-1 rounded-full bg-blue-500 mr-1.5 animate-ping"></span>}
                                                {status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        {/* Fill empty rows to maintain height consistency */}
                        {paginatedData.length > 0 && paginatedData.length < rowsPerPage && (
                            Array.from({ length: rowsPerPage - paginatedData.length }).map((_, i) => (
                                <tr key={`empty-${i}`} className="h-10 border-none bg-white"><td colSpan={4}></td></tr>
                            ))
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