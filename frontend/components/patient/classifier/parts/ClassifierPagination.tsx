'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ClassifierPaginationProps {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    onPageChange: (page: number) => void;
}

export default function ClassifierPagination({
    currentPage,
    totalPages,
    totalRecords,
    onPageChange
}: ClassifierPaginationProps) {
    return (
        <div className="px-8 py-4 border-t border-slate-50 bg-white relative z-20 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Page <span className="text-slate-800">{currentPage}</span> of <span className="text-slate-800">{totalPages}</span>
                </span>
                <div className="h-4 w-px bg-slate-200"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span className="text-teal-600">{totalRecords}</span> Records
                </span>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-teal-600 hover:border-teal-200 cursor-pointer"
                >
                    <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                </button>
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-teal-600 hover:border-teal-200 cursor-pointer"
                >
                    <ChevronRight className="w-4 h-4" strokeWidth={3} />
                </button>
            </div>
        </div>
    );
}
