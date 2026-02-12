'use client';

import { useEffect, useRef } from 'react';
import { History, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight, User as UserIcon } from 'lucide-react';
import clsx from 'clsx';
import { formatDate } from '@/utils/helpers';

export interface ApprovalLog {
    id: string;
    user_id: number;
    username: string;
    full_name: string;
    is_patient: boolean;
    is_operator: boolean;
    is_doctor: boolean;
    status: 'QUEUE' | 'APPROVED' | 'REJECTED';
    reason?: string;
    created_dt: string;
    created_by: string;
}

interface ApprovalLogsProps {
    logs: ApprovalLog[];
    rowsPerPage: number;
    setRowsPerPage: (count: number) => void;
    currentPage: number;
    setCurrentPage: (page: number) => void;
}

export default function ApprovalLogs({ logs, rowsPerPage, setRowsPerPage, currentPage, setCurrentPage }: ApprovalLogsProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Dynamic row calculation based on container height - Mimics ClassifierTable mechanism
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.contentRect.height;
                const headerHeight = 56; // Matching the h-[56px] in thead
                const availableHeight = height - headerHeight;
                
                // At 1080p, we want roughly 10 rows. 
                // Row height is h-[52px].
                const idealRows = 10;
                const rowHeight = 52; 
                
                const calculatedRows = Math.max(1, Math.floor(availableHeight / rowHeight));
                
                // If we have more space than 10 rows, we cap it at 10 to keep it "Clean" 
                // but if we have less (lower resolution), we reduce it to fit.
                if (calculatedRows >= idealRows) {
                    setRowsPerPage(idealRows);
                } else {
                    setRowsPerPage(calculatedRows);
                }
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [setRowsPerPage]);

    // The 'logs' array is already filtered by the backend via AdminConsole API calls
    const displayLogs = logs;

    const totalPages = Math.ceil(displayLogs.length / rowsPerPage) || 1;
    const paginatedLogs = displayLogs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const onPageChange = (page: number) => {
        setCurrentPage(page);
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden animate-in fade-in duration-500">
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                
                {/* Table Container - Mimics ClassifierTable structure with ResizeObserver */}
                <div ref={containerRef} className="flex-1 overflow-x-auto no-scrollbar relative z-10 overflow-y-hidden">
                    <table className="w-full text-left border-collapse table-fixed lg:table-auto h-full">
                        <thead className="bg-slate-50/50 text-slate-400 sticky top-0 z-10 backdrop-blur-sm h-[56px]">
                            <tr>
                                <th className="px-4 lg:px-6 font-black text-[10px] 2xl:text-xs uppercase tracking-[0.15em] border-b border-slate-100 whitespace-nowrap w-[180px]">
                                    Date & Time
                                </th>
                                <th className="px-4 lg:px-6 font-black text-[10px] 2xl:text-xs uppercase tracking-[0.15em] border-b border-slate-100 whitespace-nowrap">
                                    User Profile
                                </th>
                                <th className="px-4 lg:px-6 font-black text-[10px] 2xl:text-xs uppercase tracking-[0.15em] border-b border-slate-100 whitespace-nowrap w-[140px]">
                                    Status
                                </th>
                                <th className="px-4 lg:px-6 font-black text-[10px] 2xl:text-xs uppercase tracking-[0.15em] border-b border-slate-100 whitespace-nowrap">
                                    Reason / Notes
                                </th>
                                <th className="px-4 lg:px-6 font-black text-[10px] 2xl:text-xs uppercase tracking-[0.15em] border-b border-slate-100 whitespace-nowrap w-[120px]">
                                    Admin
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center opacity-30">
                                            <History size={48} className="text-slate-300 mb-3" />
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">No History Found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group h-[52px]">
                                        <td className="px-4 lg:px-6 whitespace-nowrap">
                                            <p className="text-[11px] 2xl:text-xs font-bold text-slate-700">{formatDate(log.created_dt).split(',')[0]}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{formatDate(log.created_dt).split(',')[1]}</p>
                                        </td>
                                        <td className="px-4 lg:px-6 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors">
                                                    <UserIcon size={14} />
                                                </div>
                                                <div className="flex flex-col leading-tight">
                                                    <span className="text-[11px] 2xl:text-xs font-black text-slate-800">{log.full_name || log.username}</span>
                                                    <span className="text-[9px] font-bold text-slate-400">@{log.username}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 lg:px-6 whitespace-nowrap">
                                            <div className={clsx(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter border shadow-sm transition-all",
                                                log.status === 'APPROVED' ? "bg-emerald-500 text-white border-emerald-600" :
                                                log.status === 'REJECTED' ? "bg-rose-500 text-white border-rose-600" :
                                                "bg-amber-500 text-white border-amber-600"
                                            )}>
                                                {log.status === 'APPROVED' && <CheckCircle2 size={10} />}
                                                {log.status === 'REJECTED' && <XCircle size={10} />}
                                                {log.status === 'QUEUE' && <Clock size={10} />}
                                                {log.status}
                                            </div>
                                        </td>
                                        <td className="px-4 lg:px-6 whitespace-nowrap">
                                            <p className="text-[11px] font-medium text-slate-600 max-w-[200px] xl:max-w-xs truncate" title={log.reason}>
                                                {log.reason || '-'}
                                            </p>
                                        </td>
                                        <td className="px-4 lg:px-6 whitespace-nowrap text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            {log.created_by}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls - Identical to ClassifierPagination */}
                <div className="px-8 py-4 border-t border-slate-50 bg-white relative z-20 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Page <span className="text-slate-800">{currentPage}</span> of <span className="text-slate-800">{totalPages}</span>
                        </span>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span className="text-rose-600">{displayLogs.length}</span> Records
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-rose-600 hover:border-rose-200"
                        >
                            <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                        </button>
                        <button
                            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-rose-600 hover:border-rose-200"
                        >
                            <ChevronRight className="w-4 h-4" strokeWidth={3} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
