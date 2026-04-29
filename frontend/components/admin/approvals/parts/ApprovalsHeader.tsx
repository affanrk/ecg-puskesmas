import React from 'react';
import clsx from 'clsx';
import ApprovalFilters from './ApprovalFilters';

interface ApprovalsHeaderProps {
    approvalType: 'patient' | 'operator' | 'doctor';
    setApprovalType: (type: 'patient' | 'operator' | 'doctor') => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    startDate: string;
    endDate: string;
    onDateRangeChange: (start: string, end: string) => void;
    resetFilters: () => void;
    isFilterActive: boolean;
    isResetting: boolean;
}

export function ApprovalsHeader({
    approvalType,
    setApprovalType,
    searchTerm,
    setSearchTerm,
    startDate,
    endDate,
    onDateRangeChange,
    resetFilters,
    isFilterActive,
    isResetting
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

            <div className="flex-1 flex items-center min-w-0">
                <ApprovalFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    startDate={startDate}
                    endDate={endDate}
                    onDateRangeChange={onDateRangeChange}
                    onResetFilters={resetFilters}
                    isFilterActive={isFilterActive}
                    isResetting={isResetting}
                />
            </div>
        </div>
    );
}
