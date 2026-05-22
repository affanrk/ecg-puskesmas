type ApprovalType = 'additional_location' | 'transfer' | 'profile_update';

interface LocationRequestsFiltersProps {
    filterType: ApprovalType | 'all';
    onFilterChange: (type: ApprovalType | 'all') => void;
    counts: {
        all: number;
        additional_location: number;
        transfer: number;
        profile_update: number;
    };
}

export default function LocationRequestsFilters({ filterType, onFilterChange, counts }: LocationRequestsFiltersProps) {
    return (
        <div className="flex gap-2 shrink-0">
            <button
                onClick={() => onFilterChange('all')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    filterType === 'all'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
            >
                All ({counts.all})
            </button>
            <button
                onClick={() => onFilterChange('additional_location')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    filterType === 'additional_location'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
            >
                Additional Location ({counts.additional_location})
            </button>
            <button
                onClick={() => onFilterChange('transfer')}
                disabled
                className="px-4 py-2 rounded-lg font-medium text-sm bg-white text-slate-400 border border-slate-200 cursor-not-allowed"
            >
                Transfer ({counts.transfer})
            </button>
            <button
                onClick={() => onFilterChange('profile_update')}
                disabled
                className="px-4 py-2 rounded-lg font-medium text-sm bg-white text-slate-400 border border-slate-200 cursor-not-allowed"
            >
                Profile Update ({counts.profile_update})
            </button>
        </div>
    );
}
