'use client';

import { Search, Plus } from 'lucide-react';

import StandardInput from '@/components/shared/StandardInput';
import SelectInput from '@/components/shared/SelectInput';

interface LocationFiltersProps {
    searchTerm: string;
    filterType: string;
    filterStatus: string;
    onSearchChange: (value: string) => void;
    onTypeChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onCreateLocation: () => void;
}

export default function LocationFilters({
    searchTerm,
    filterType,
    filterStatus,
    onSearchChange,
    onTypeChange,
    onStatusChange,
    onCreateLocation
}: LocationFiltersProps) {
    return (
        <div className="h-[64px] shrink-0 border-b border-slate-100 flex items-center px-4 lg:px-10 bg-slate-50/50">
            <div className="flex-1 flex items-center gap-3 min-w-0">
                <div className="flex-1 min-w-[200px] max-w-md">
                    <StandardInput
                        label=""
                        type="text"
                        placeholder="Search locations..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        icon={<Search size={14} />}
                        colorTheme="violet"
                    />
                </div>
                
                <div className="w-48">
                    <SelectInput
                        label=""
                        value={filterType}
                        onChange={(e) => onTypeChange(e.target.value)}
                        options={[
                            { value: '', label: 'All Types' },
                            { value: 'PUSKESMAS', label: 'Puskesmas' },
                            { value: 'CLINIC', label: 'Clinic' },
                            { value: 'HOSPITAL', label: 'Hospital' },
                            { value: 'LABORATORY', label: 'Laboratory' }
                        ]}
                        placeholder="Select Type"
                        colorTheme="violet"
                    />
                </div>
                
                <div className="w-48">
                    <SelectInput
                        label=""
                        value={filterStatus}
                        onChange={(e) => onStatusChange(e.target.value)}
                        options={[
                            { value: '', label: 'All Status' },
                            { value: 'active', label: 'Active' },
                            { value: 'inactive', label: 'Inactive' }
                        ]}
                        placeholder="Select Status"
                        colorTheme="violet"
                    />
                </div>

                <button
                    onClick={onCreateLocation}
                    className="flex items-center gap-2 px-4 h-[42px] bg-slate-900 hover:bg-violet-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
                >
                    <Plus size={16} /> <span className="hidden sm:inline">New Location</span>
                </button>
            </div>
        </div>
    );
}
