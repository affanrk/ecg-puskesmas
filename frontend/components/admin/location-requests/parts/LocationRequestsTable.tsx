import { useEffect, useRef } from 'react';
import { RefreshCcw, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { AdditionalLocationRequest } from '@/types/models';
import LocationRequestTableRow from './LocationRequestTableRow';

interface LocationRequestsTableProps {
    requests: AdditionalLocationRequest[];
    loading: boolean;
    rowsPerPage: number;
    setRowsPerPage: (rows: number) => void;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    onApprove: (request: AdditionalLocationRequest) => void;
    onReject: (request: AdditionalLocationRequest) => void;
}

export default function LocationRequestsTable({ 
    requests, 
    loading, 
    rowsPerPage,
    setRowsPerPage,
    currentPage,
    setCurrentPage,
    onApprove, 
    onReject 
}: LocationRequestsTableProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const totalPages = Math.ceil(requests.length / rowsPerPage) || 1;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedRequests = requests.slice(startIndex, endIndex);

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

    if (loading) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center py-20">
                <RefreshCcw size={40} className="text-slate-300 animate-spin mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Requests...</p>
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center py-20">
                <Clock size={48} className="text-slate-300 mb-4" />
                <p className="text-slate-500 font-medium text-sm">No pending approval requests</p>
                <p className="text-slate-400 text-xs mt-1">All requests have been processed</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div ref={containerRef} className="flex-1 overflow-x-auto no-scrollbar relative z-10 overflow-y-hidden">
                <table className="w-full text-left border-collapse table-auto h-full">
                    <thead className="bg-slate-50/80 text-slate-400 sticky top-0 z-10 backdrop-blur-sm h-[48px]">
                        <tr>
                            <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Staff</th>
                            <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Location</th>
                            <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Requested By</th>
                            <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Reason</th>
                            <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Date</th>
                            <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap text-right pr-6">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedRequests.map((request) => (
                            <LocationRequestTableRow
                                key={request.id}
                                request={request}
                                onApprove={onApprove}
                                onReject={onReject}
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
                        <span className="text-rose-600">{requests.length}</span> Total Requests
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
    );
}
