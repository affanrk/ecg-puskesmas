import { Trash2, Search } from 'lucide-react';
import clsx from 'clsx';
import StandardInput from '@/components/shared/StandardInput';
import FlatpickrInput from '@/components/shared/FlatpickrInput';

interface ApprovalFiltersProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    startDate: string;
    endDate: string;
    onDateRangeChange: (start: string, end: string) => void;
    onResetFilters: () => void;
    isFilterActive: boolean;
    isResetting: boolean;
}

export default function ApprovalFilters({
    searchTerm,
    setSearchTerm,
    startDate,
    endDate,
    onDateRangeChange,
    onResetFilters,
    isFilterActive,
    isResetting
}: ApprovalFiltersProps) {
    const dateValue = startDate && endDate ? `${startDate} to ${endDate}` : '';
    
    const dateKey = startDate || endDate ? 'with-dates' : 'empty';

    return (
        <div className="flex items-center gap-3 min-w-0 flex-1">
            <button 
                onClick={onResetFilters} 
                disabled={!isFilterActive || isResetting} 
                className={clsx(
                    "flex items-center gap-2 px-3 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all shrink-0 h-[42px]",
                    isFilterActive 
                        ? "bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 shadow-sm cursor-pointer" 
                        : "text-slate-300 cursor-not-allowed border border-slate-100 bg-slate-50",
                    isResetting && "opacity-50 cursor-wait"
                )}
            >
                {isResetting ? (
                    <div className="w-3 h-3 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                ) : (
                    <Trash2 size={12} />
                )} 
                Reset
            </button>
            
            <div className="flex-1 min-w-[200px]">
                <FlatpickrInput
                    key={dateKey}
                    label=""
                    value={dateValue}
                    onChange={() => {}}
                    mode="range"
                    onRangeChange={onDateRangeChange}
                    placeholder="Select Date Range"
                    colorTheme="rose"
                />
            </div>
            
            <div className="flex-1 min-w-[200px]">
                <StandardInput
                    label=""
                    type="text"
                    placeholder="Search by Name or NIK..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={<Search size={14} />}
                    colorTheme="rose"
                />
            </div>
        </div>
    );
}
