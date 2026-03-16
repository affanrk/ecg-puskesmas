import React from 'react';
import { Trash2, Calendar as CalendarIcon, Search } from 'lucide-react';
import clsx from 'clsx';

interface ApprovalsHeaderProps {
    approvalType: 'patient' | 'operator' | 'doctor';
    setApprovalType: (type: 'patient' | 'operator' | 'doctor') => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    resetFilters: () => void;
    isFilterActive: boolean;
    isResetting: boolean;
    dateInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ApprovalsHeader({
    approvalType,
    setApprovalType,
    searchTerm,
    setSearchTerm,
    resetFilters,
    isFilterActive,
    isResetting,
    dateInputRef
}: ApprovalsHeaderProps) {
    return (
        <div className="h-[64px] shrink-0 border-b border-slate-100 flex items-center px-8 bg-slate-50/50 gap-8">
            <div className="flex items-center gap-6 h-full shrink-0">
                <button onClick={() => setApprovalType('patient')} className={clsx("text-[10px] font-black uppercase tracking-[0.2em] transition-all relative h-full flex items-center cursor-pointer", approvalType === 'patient' ? "text-rose-600" : "text-slate-400 hover:text-slate-600")}>
                    Patients {approvalType === 'patient' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />}
                </button>
                <button onClick={() => setApprovalType('operator')} className={clsx("text-[10px] font-black uppercase tracking-[0.2em] transition-all relative h-full flex items-center cursor-pointer", approvalType === 'operator' ? "text-rose-600" : "text-slate-400 hover:text-slate-600")}>
                    Operators {approvalType === 'operator' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />}
                </button>
                <button onClick={() => setApprovalType('doctor')} className={clsx("text-[10px] font-black uppercase tracking-[0.2em] transition-all relative h-full flex items-center cursor-pointer", approvalType === 'doctor' ? "text-rose-600" : "text-slate-400 hover:text-slate-600")}>
                    Specialists {approvalType === 'doctor' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />}
                </button>
            </div>

            <div className="w-px h-6 bg-slate-200 shrink-0" />

            <div className="flex-1 flex items-center justify-end gap-3 min-w-0">
                <button onClick={resetFilters} disabled={!isFilterActive || isResetting} className={clsx("flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0", isFilterActive ? "bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 shadow-sm cursor-pointer" : "text-slate-300 cursor-not-allowed border border-slate-100", isResetting && "opacity-50 cursor-wait")}>
                    {isResetting ? <div className="w-3 h-3 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" /> : <Trash2 size={12} />} Reset
                </button>
                <div className="relative group/date shrink-0">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none z-10" />
                    <input type="text" ref={dateInputRef} className="hidden" />
                </div>
                <div className="relative group shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                    <input type="text" placeholder="Search by Name or NIK..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold w-64 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all shadow-sm" />
                </div>
            </div>
        </div>
    );
}
