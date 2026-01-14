'use client';

import React from 'react';
import { useStore } from '@/store/useStore';
import { CONFIG } from '@/config/constants';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { escapeHtml } from '@/utils/helpers';

export default function LiveTable() {
    const { liveData, livePage, setLivePage, patient } = useStore();
    
    const rowsPerPage = CONFIG.ROWS_PER_PAGE_LIVE;
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

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-700 text-xs">Analysis Log</h3>
                <span className="text-[10px] text-slate-400 font-mono" id="live-total-count">{liveData.length} Recs</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-400 font-bold tracking-wider">
                        <tr>
                            <th className="px-4 py-2">Time</th>
                            <th className="px-4 py-2">ID</th>
                            <th className="px-4 py-2">Name</th>
                            <th className="px-4 py-2">Result</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs italic font-medium">
                                    {patient ? "Waiting for analysis..." : ""}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((rec) => {
                                const timeStr = new Date(rec.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                const safeClass = (rec.classification || '').toString();
                                let statusColor = 'bg-slate-100 text-slate-500 ring-slate-200';
                                if (safeClass === 'Normal') statusColor = 'bg-emerald-50 text-emerald-600 ring-emerald-200';
                                else if (['Abnormal', 'Aritmia', 'Berpotensi'].some(x => safeClass.includes(x))) statusColor = 'bg-rose-50 text-rose-600 ring-rose-200';
                                else if (safeClass === 'Recording...') statusColor = 'bg-blue-50 text-blue-600 ring-blue-200 animate-pulse';

                                return (
                                    <tr key={rec.id || `${rec.timestamp}-${rec.classification}-${rec.subject_id}`} className="hover:bg-slate-50 transition-colors h-10 text-xs leading-none group animate-new-row">
                                        <td className="px-4 py-0 font-mono text-slate-500 align-middle tracking-tighter">{timeStr}</td>
                                        <td className="px-4 py-0 font-mono text-slate-600 align-middle tracking-tighter">{escapeHtml(rec.subject_id)}</td>
                                        <td className="px-4 py-0 font-bold text-slate-700 truncate max-w-[150px] align-middle tracking-tight">{escapeHtml(rec.patient_name)}</td>
                                        <td className="px-4 py-0 align-middle">
                                            <span className={clsx("inline-flex items-center rounded px-2 py-1 text-[10px] font-bold ring-1 ring-inset uppercase tracking-wide", statusColor)}>
                                                {safeClass}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                <span className="text-[10px] text-slate-500">Page <span id="live-page-current"
                        className="font-bold text-slate-700">{livePage}</span> / <span id="live-page-total">{totalPages}</span></span>
                <div className="flex gap-1">
                    <button id="btn-prev-live"
                        onClick={() => changePage(-1)}
                        disabled={livePage <= 1}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button id="btn-next-live"
                        onClick={() => changePage(1)}
                        disabled={livePage >= totalPages}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
