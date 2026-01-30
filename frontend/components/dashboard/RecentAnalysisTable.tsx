'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { History, RefreshCcw, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

interface RecentAnalysisTableProps {
    loading: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recentRecords: any[];
    loadDashboardData: () => void;
    highlight: boolean;
}

export default function RecentAnalysisTable({ 
    loading, 
    recentRecords, 
    loadDashboardData,
    highlight 
}: RecentAnalysisTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const containerRef = useRef<HTMLDivElement>(null);

    // Responsive Table Height Logic
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.contentRect.height;
                const availableHeight = height - 50; 
                const calculatedRows = Math.max(1, Math.floor(availableHeight / 48));
                setRowsPerPage(calculatedRows);
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Reset pagination when data changes significantly
    useEffect(() => {
        // eslint-disable-next-line
        setCurrentPage(1);
    }, [recentRecords]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * rowsPerPage;
        return recentRecords.slice(startIndex, startIndex + rowsPerPage);
    }, [recentRecords, currentPage, rowsPerPage]);

    const totalPages = Math.max(1, Math.ceil(recentRecords.length / rowsPerPage));

    const formatDateTime = (isoString: string) => {
        if (!isoString) return { date: '-', time: '' };
        const dateObj = new Date(isoString);
        return {
            date: dateObj.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            time: dateObj.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        };
    };

    return (
        <div className="lg:col-span-3 bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col overflow-hidden transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] duration-500">
            <div className="px-8 py-4 border-b border-slate-50 flex items-center justify-between bg-white/50 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-md flex items-center justify-center border border-slate-100 shadow-sm">
                        <History size={18} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 text-sm tracking-tight">Recent Analysis</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Historical Logs</p>
                    </div>
                </div>
                
                <button 
                    onClick={loadDashboardData}
                    disabled={loading}
                    className={clsx(
                        "group px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                        loading 
                            ? "bg-slate-50 text-slate-300 cursor-not-allowed" 
                            : "bg-slate-50 text-slate-500 hover:bg-teal-50 hover:text-teal-600 border border-slate-100 hover:border-teal-100 shadow-sm"
                    )}
                >
                    <span>Refresh</span>
                    <RefreshCcw size={12} strokeWidth={3} className={clsx(loading && "animate-spin text-teal-500")} />
                </button>
            </div>
            
            <div ref={containerRef} className="flex-1 overflow-hidden relative z-10">
                {loading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center gap-4 opacity-40 py-20">
                        <div className="animate-spin text-teal-500">
                            <Clock size={48} />
                        </div>
                        <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Syncing Analysis...</span>
                    </div>
                ) : recentRecords.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 opacity-30">
                        <History size={64} className="text-slate-300" />
                        <span className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">No Records Found</span>
                    </div>
                ) : (
                    <div className="h-full w-full overflow-x-auto no-scrollbar overflow-y-hidden">
                        <table className="w-full h-full text-left border-collapse table-auto">
                            <thead className="bg-slate-50/30 text-slate-400 sticky top-0 z-10 backdrop-blur-md h-[50px]">
                                <tr>
                                    <th className="px-3 sm:px-4 lg:px-6 font-black text-xs uppercase tracking-[0.15em] border-b border-slate-50 whitespace-nowrap">Time & Date</th>
                                    <th className="px-3 sm:px-4 lg:px-6 font-black text-xs uppercase tracking-[0.15em] border-b border-slate-50 whitespace-nowrap">Classification</th>
                                    <th className="px-3 sm:px-4 lg:px-6 font-black text-xs uppercase tracking-[0.15em] border-b border-slate-50 text-right whitespace-nowrap">Confidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedData.map((row, idx) => {
                                    const cls = row.classification?.toLowerCase() || '';
                                    const isHighRisk = cls.includes('sangat') || cls.includes('high');
                                    const isPotential = cls.includes('berpotensi') || cls.includes('potential');
                                    const isAbnormal = cls.includes('abnormal');
                                    const isNormal = cls.includes('normal');

                                    return (
                                        <tr key={idx} className={clsx(
                                            "hover:bg-slate-50/50 transition-colors group h-[48px]",
                                            highlight && idx === 0 && currentPage === 1 && "bg-emerald-50/20"
                                        )}>
                                            <td className="px-3 sm:px-4 lg:px-6 py-2 whitespace-nowrap">
                                                <div className="font-mono text-sm font-bold text-slate-700">
                                                    {formatDateTime(row.changed_dt || row.timestamp).time}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                                    {formatDateTime(row.changed_dt || row.timestamp).date}
                                                </div>
                                            </td>
                                            <td className="px-3 sm:px-4 lg:px-6 py-4 whitespace-nowrap">
                                                <span className={clsx(
                                                    "inline-flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-[0.12em] transition-all border shadow-sm whitespace-nowrap max-w-full",
                                                    isHighRisk && "bg-rose-500 text-white border-rose-600",
                                                    isPotential && !isHighRisk && "bg-orange-500 text-white border-orange-600",
                                                    isAbnormal && !isHighRisk && !isPotential && "bg-slate-500 text-white border-slate-600",
                                                    isNormal && "bg-emerald-500 text-white border-emerald-600",
                                                    !isHighRisk && !isPotential && !isAbnormal && !isNormal && "bg-slate-50 text-slate-500 border-slate-100"
                                                )}>
                                                    <span className={clsx("w-1.5 h-1.5 rounded-full bg-white")}></span>
                                                    {row.classification}
                                                </span>
                                            </td>
                                            <td className="px-3 sm:px-4 lg:px-6 py-4 text-right whitespace-nowrap">
                                                <span className="font-mono text-xs font-black text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-100 shadow-inner">
                                                    {row.confidence ? (row.confidence * 100).toFixed(0) + '%' : '-'}
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

            {/* Pagination Footer */}
            <div className="px-8 py-4 border-t border-slate-50 bg-slate-50/20 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Page {currentPage} of {totalPages}</span>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-teal-600 hover:border-teal-200"
                    >
                        <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                    </button>
                    <button 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-teal-600 hover:border-teal-200"
                    >
                        <ChevronRight className="w-4 h-4" strokeWidth={3} />
                    </button>
                </div>
            </div>
        </div>
    );
}
