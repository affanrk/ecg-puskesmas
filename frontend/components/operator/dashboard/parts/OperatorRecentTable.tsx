'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { History, RefreshCcw, Clock, ChevronLeft, ChevronRight, User } from 'lucide-react';
import clsx from 'clsx';
import { AnalysisResult } from '@/types/models';
import { formatDateTime } from '@/utils/helpers';

interface OperatorRecentTableProps {
    loading: boolean;
    recentRecords: AnalysisResult[];
    loadDashboardData: () => void;
    highlight: boolean;
}

export default function OperatorRecentTable({
    loading,
    recentRecords,
    loadDashboardData,
    highlight
}: OperatorRecentTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const containerRef = useRef<HTMLDivElement>(null);

    const totalPages = Math.max(1, Math.ceil(recentRecords.length / rowsPerPage));
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        return recentRecords.slice(start, start + rowsPerPage);
    }, [recentRecords, currentPage, rowsPerPage]);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.contentRect.height;
                const available = height - 60 - 60;
                const is2xl = window.innerWidth >= 1536;
                const rowH = is2xl ? 52 : 48;
                const rows = Math.max(1, Math.min(10, Math.floor(available / rowH)));
                setRowsPerPage(rows);
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div className="bg-white flex flex-col overflow-hidden transition-all duration-500 min-h-0 h-full">
            <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 2xl:w-12 2xl:h-12 bg-slate-50 text-slate-400 rounded-md flex items-center justify-center border border-slate-100 shadow-sm">
                        <History size={18} className="2xl:w-6 2xl:h-6" strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 text-sm 2xl:text-base tracking-tight italic">RECENT ANALYSIS</h3>
                        <p className="text-[10px] 2xl:text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Last 10 Recorded Sessions</p>
                    </div>
                </div>
                <button
                    onClick={loadDashboardData}
                    disabled={loading}
                    className={clsx(
                        "group px-4 py-2 2xl:px-6 2xl:py-2.5 rounded-md text-[10px] 2xl:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        loading
                            ? "bg-slate-50 text-slate-300 cursor-not-allowed"
                            : "bg-slate-50 text-slate-500 hover:bg-teal-50 hover:text-teal-600 border border-slate-100 hover:border-teal-100 shadow-sm cursor-pointer"
                    )}
                >
                    <span>Refresh</span>
                    <RefreshCcw size={12} strokeWidth={3} className={clsx(loading && "animate-spin text-teal-500")} />
                </button>
            </div>
            <div ref={containerRef} className="flex-1 overflow-hidden relative z-10 bg-white">
                {loading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-4 opacity-40">
                        <div className="animate-spin text-teal-500">
                            <Clock size={48} />
                        </div>
                        <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Syncing...</span>
                    </div>
                ) : recentRecords.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 opacity-30">
                        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                            <User size={24} className="text-slate-300" />
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">No Sessions Recorded Yet</p>
                    </div>
                ) : (
                    <div className="h-full w-full overflow-x-auto no-scrollbar overflow-y-hidden bg-white">
                        <table className="w-full h-full text-left border-collapse table-fixed">
                            <thead className="bg-slate-50/50 text-slate-400 sticky top-0 z-20">
                                <tr className="h-[48px] 2xl:h-[52px]">
                                    <th className="w-[140px] 2xl:w-[200px] px-8 font-black text-[10px] 2xl:text-xs uppercase tracking-[0.15em] border-b border-slate-50 whitespace-nowrap">Time & Date</th>
                                    <th className="px-4 font-black text-[10px] 2xl:text-xs uppercase tracking-[0.15em] border-b border-slate-50 whitespace-nowrap">Patient</th>
                                    <th className="px-4 font-black text-[10px] 2xl:text-xs uppercase tracking-[0.15em] border-b border-slate-50 whitespace-nowrap">Result</th>
                                    <th className="w-[100px] 2xl:w-[130px] pr-8 text-right font-black text-[10px] 2xl:text-xs uppercase tracking-[0.15em] border-b border-slate-50 whitespace-nowrap">Confidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedData.map((row, idx) => {
                                    const dt = formatDateTime(row.changed_dt || row.timestamp);
                                    const isHighlighted = highlight && idx === 0 && currentPage === 1;
                                    const cls = (row.classification || row.classification_result)?.toLowerCase() || '';
                                    const isSangat = cls.includes('sangat');
                                    const isFast = cls.includes('fast');
                                    const isSlow = cls.includes('slow');
                                    const isBerpotensi = cls.includes('berpotensi');
                                    const isAbnormal = cls.includes('abnormal');
                                    const isNormal = cls.includes('normal');
                                    return (
                                        <tr
                                            key={row.recording_id || idx}
                                            className={clsx(
                                                "h-[48px] 2xl:h-[52px] transition-colors duration-300",
                                                isHighlighted ? "bg-teal-50/50" : "hover:bg-slate-50/50"
                                            )}
                                        >
                                            <td className="px-8 whitespace-nowrap">
                                                <div className="text-xs 2xl:text-sm font-black text-slate-700 leading-none">{dt.time}</div>
                                                <div className="text-[9px] 2xl:text-[10px] font-bold text-slate-400 mt-0.5">{dt.date}</div>
                                            </td>
                                            <td className="px-4 whitespace-nowrap">
                                                <div className="text-xs 2xl:text-sm font-bold text-slate-700 truncate max-w-[160px]">
                                                    {row.patient_name || '—'}
                                                </div>
                                                <div className="text-[9px] font-bold text-slate-400 font-mono truncate">
                                                    {row.subject_id || '—'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2">
                                                <span className={clsx(
                                                    "inline-flex items-center gap-2.5 px-3 py-1.5 2xl:py-2 rounded-md text-[10px] 2xl:text-[11px] font-black uppercase tracking-[0.12em] transition-all border whitespace-nowrap max-w-full overflow-hidden",
                                                    isSangat && "bg-rose-50 text-rose-600 border-rose-100",
                                                    (isFast || isBerpotensi) && !isSangat && "bg-orange-50 text-orange-600 border-orange-100",
                                                    isSlow && !isSangat && !isFast && !isBerpotensi && "bg-amber-50 text-amber-600 border-amber-100",
                                                    isAbnormal && !isSangat && !isFast && !isBerpotensi && !isSlow && "bg-slate-50 text-slate-600 border-slate-100",
                                                    isNormal && "bg-emerald-50 text-emerald-600 border-emerald-100",
                                                    !isSangat && !isFast && !isBerpotensi && !isSlow && !isAbnormal && !isNormal && "bg-slate-50 text-slate-400 border-slate-100"
                                                )}>
                                                    <span className={clsx(
                                                        "w-1.5 h-1.5 rounded-full shrink-0",
                                                        isSangat && "bg-rose-500",
                                                        (isFast || isBerpotensi) && !isSangat && "bg-orange-500",
                                                        isSlow && !isSangat && !isFast && !isBerpotensi && "bg-amber-500",
                                                        isAbnormal && !isSangat && !isFast && !isBerpotensi && !isSlow && "bg-slate-500",
                                                        isNormal && "bg-emerald-500",
                                                        !isSangat && !isFast && !isBerpotensi && !isSlow && !isAbnormal && !isNormal && "bg-slate-300"
                                                    )}></span>
                                                    <span className="truncate">{(row.classification || row.classification_result || '—')}</span>
                                                </span>
                                            </td>
                                            <td className="pr-8 text-right">
                                                <span className="text-xs 2xl:text-sm font-black text-slate-500 font-mono">
                                                    {row.confidence != null ? `${(row.confidence * 100).toFixed(1)}%` : '—'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <div className="px-8 py-4 border-t border-slate-50 bg-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-[9px] 2xl:text-[10px] font-black uppercase tracking-widest text-slate-400">Page {currentPage} of {totalPages}</span>
                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                    <span className="text-[9px] 2xl:text-[10px] font-black uppercase tracking-widest text-slate-300">{recentRecords.length} Records</span>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 2xl:p-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-teal-600 hover:border-teal-200 cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4 2xl:w-5 2xl:h-5" strokeWidth={3} />
                    </button>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 2xl:p-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-teal-600 hover:border-teal-200 cursor-pointer"
                    >
                        <ChevronRight className="w-4 h-4 2xl:w-5 2xl:h-5" strokeWidth={3} />
                    </button>
                </div>
            </div>
        </div>
    );
}
