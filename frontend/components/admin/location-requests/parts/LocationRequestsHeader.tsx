import clsx from 'clsx';

type ApprovalType = 'additional_location' | 'transfer' | 'profile_update';

interface LocationRequestsHeaderProps {
    filterType: ApprovalType | 'all';
    onFilterChange: (type: ApprovalType | 'all') => void;
    counts: {
        all: number;
        additional_location: number;
        transfer: number;
        profile_update: number;
    };
}

export default function LocationRequestsHeader({ 
    filterType, 
    onFilterChange, 
    counts
}: LocationRequestsHeaderProps) {
    return (
        <div className="h-[64px] shrink-0 border-b border-slate-100 flex items-center px-8 bg-slate-50/50 gap-8">
            <div className="flex items-center gap-6 h-full shrink-0">
                <button 
                    onClick={() => onFilterChange('all')} 
                    className={clsx(
                        "text-[10px] font-black uppercase tracking-[0.2em] transition-all relative h-full flex items-center cursor-pointer",
                        filterType === 'all' ? "text-rose-600" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    All ({counts.all})
                    {filterType === 'all' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />}
                </button>
                <button 
                    onClick={() => onFilterChange('additional_location')} 
                    className={clsx(
                        "text-[10px] font-black uppercase tracking-[0.2em] transition-all relative h-full flex items-center cursor-pointer",
                        filterType === 'additional_location' ? "text-rose-600" : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    Additional Location ({counts.additional_location})
                    {filterType === 'additional_location' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500 rounded-full" />}
                </button>
                <button 
                    disabled
                    className="text-[10px] font-black uppercase tracking-[0.2em] transition-all relative h-full flex items-center text-slate-300 cursor-not-allowed"
                >
                    Transfer ({counts.transfer})
                </button>
                <button 
                    disabled
                    className="text-[10px] font-black uppercase tracking-[0.2em] transition-all relative h-full flex items-center text-slate-300 cursor-not-allowed"
                >
                    Profile Update ({counts.profile_update})
                </button>
            </div>
        </div>
    );
}
