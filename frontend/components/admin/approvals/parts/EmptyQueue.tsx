import React from 'react';
import { UserX } from 'lucide-react';

interface EmptyQueueProps {
    searchTerm: string;
    dateRange: { start: string, end: string };
}

export function EmptyQueue({ searchTerm, dateRange }: EmptyQueueProps) {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-white/50 animate-in fade-in duration-500">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-3">
                <UserX size={24} />
            </div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Empty Queue</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {searchTerm || dateRange.start ? "No matching results" : "No pending verifications"}
            </p>
        </div>
    );
}
