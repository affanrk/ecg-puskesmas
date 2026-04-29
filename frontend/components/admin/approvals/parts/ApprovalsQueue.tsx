'use client';

import { useEffect, useRef } from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { EmptyQueue } from './EmptyQueue';
import { QueueTableRow } from './QueueTableRow';
import { User } from '@/types/user';

interface ApprovalsQueueProps {
    users: User[];
    rowsPerPage: number;
    setRowsPerPage: (count: number) => void;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    searchTerm: string;
    dateRange: { start: string, end: string };
    onApprove: (id: string, name: string) => void;
    onReject: (id: string, name: string) => void;
    onViewDetails: (user: User) => void;
}

export default function ApprovalsQueue({
    users,
    rowsPerPage,
    setRowsPerPage,
    currentPage,
    setCurrentPage,
    searchTerm,
    dateRange,
    onApprove,
    onReject,
    onViewDetails
}: ApprovalsQueueProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const totalPages = Math.ceil(users.length / rowsPerPage) || 1;
    const paginatedUsers = users.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.contentRect.height;
                const headerHeight = 48;
                const availableHeight = height - headerHeight;
                const idealRows = 10;
                const rowHeight = 48;
                const calculatedRows = Math.max(1, Math.floor(availableHeight / rowHeight));
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

    if (users.length === 0) {
        return <EmptyQueue searchTerm={searchTerm} dateRange={dateRange} />;
    }

    return (
        <div className="flex flex-col h-full w-full overflow-hidden animate-in fade-in duration-500">
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                <div ref={containerRef} className="flex-1 overflow-x-auto no-scrollbar overflow-y-hidden">
                    <table className="w-full text-left border-collapse table-auto h-full">
                        <thead className="bg-slate-50/80 text-slate-400 sticky top-0 z-10 backdrop-blur-sm h-[48px]">
                            <tr>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">
                                    Identity
                                </th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">
                                    NIK
                                </th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">
                                    Profile Summary
                                </th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap w-[120px]">
                                    Registered
                                </th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap text-right pr-8">
                                    Control
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedUsers.map((user) => (
                                <QueueTableRow
                                    key={user.id}
                                    user={user}
                                    onApprove={onApprove}
                                    onReject={onReject}
                                    onViewDetails={onViewDetails}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-8 py-3 border-t border-slate-50 bg-white relative z-20 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Page <span className="text-slate-800">{currentPage}</span> of <span className="text-slate-800">{totalPages}</span>
                        </span>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span className="text-amber-600">{users.length}</span> In Queue
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-rose-600 hover:border-rose-200 cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                        </button>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-rose-600 hover:border-rose-200 cursor-pointer"
                        >
                            <ChevronRight className="w-4 h-4" strokeWidth={3} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
