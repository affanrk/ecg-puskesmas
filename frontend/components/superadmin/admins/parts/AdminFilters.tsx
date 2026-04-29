'use client';

import { Search, Plus } from 'lucide-react';

import StandardInput from '@/components/shared/StandardInput';
import SelectInput from '@/components/shared/SelectInput';
import { LocationResponse } from '@/types/user';

interface AdminFiltersProps {
    searchTerm: string;
    filterStatus: string;
    locations: LocationResponse[];
    selectedLocationId: string | null;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onLocationChange: (locationId: string | null) => void;
    onCreateAdmin: () => void;
}

export default function AdminFilters({
    searchTerm,
    filterStatus,
    locations,
    selectedLocationId,
    onSearchChange,
    onStatusChange,
    onLocationChange,
    onCreateAdmin
}: AdminFiltersProps) {
    const locationOptions = [
        { value: '', label: 'All Locations' },
        ...locations.map(loc => ({
            value: loc.id,
            label: `${loc.location_code} - ${loc.name}${!loc.is_active ? ' (Inactive)' : ''}`,
            description: !loc.is_active ? 'This location is currently inactive' : undefined
        }))
    ];

    return (
        <div className="h-[64px] shrink-0 border-b border-slate-100 flex items-center px-4 lg:px-10 bg-slate-50/50">
            <div className="flex-1 flex items-center gap-3 min-w-0">
                <div className="flex-1 min-w-[200px] max-w-md">
                    <StandardInput
                        label=""
                        type="text"
                        placeholder="Search admins..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        icon={<Search size={14} />}
                        colorTheme="violet"
                    />
                </div>
                
                <div className="w-56">
                    <SelectInput
                        label=""
                        value={selectedLocationId || ''}
                        onChange={(e) => onLocationChange(e.target.value || null)}
                        options={locationOptions}
                        placeholder="Select Location"
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
                    onClick={onCreateAdmin}
                    className="flex items-center gap-2 px-4 h-[42px] bg-slate-900 hover:bg-violet-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
                >
                    <Plus size={16} /> <span className="hidden sm:inline">New Admin</span>
                </button>
            </div>
        </div>
    );
}
