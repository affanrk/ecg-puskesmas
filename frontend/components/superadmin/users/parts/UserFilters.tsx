'use client';

import { Search } from 'lucide-react';

import StandardInput from '@/components/shared/StandardInput';
import SelectInput from '@/components/shared/SelectInput';
import { LocationResponse } from '@/types/user';

interface UserFiltersProps {
    searchTerm: string;
    roleFilter: string;
    statusFilter: string;
    locations: LocationResponse[];
    selectedLocationIds: string[];
    onSearchChange: (value: string) => void;
    onRoleChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onLocationChange: (locationIds: string[]) => void;
}

export default function UserFilters({
    searchTerm,
    roleFilter,
    statusFilter,
    locations,
    selectedLocationIds,
    onSearchChange,
    onRoleChange,
    onStatusChange,
    onLocationChange
}: UserFiltersProps) {
    const locationOptions = [
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
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        icon={<Search size={14} />}
                        colorTheme="violet"
                    />
                </div>
                
                <div className="w-56">
                    <SelectInput
                        label=""
                        value={selectedLocationIds}
                        onChange={() => {}}
                        onMultiChange={onLocationChange}
                        options={locationOptions}
                        mode="multi"
                        placeholder="Select Locations"
                        colorTheme="violet"
                    />
                </div>
                
                <div className="w-48">
                    <SelectInput
                        label=""
                        value={roleFilter}
                        onChange={(e) => onRoleChange(e.target.value)}
                        options={[
                            { value: '', label: 'All Roles' },
                            { value: 'patient', label: 'Patients' },
                            { value: 'operator', label: 'Operators' },
                            { value: 'doctor', label: 'Doctors' }
                        ]}
                        placeholder="Select Role"
                        colorTheme="violet"
                    />
                </div>
                
                <div className="w-48">
                    <SelectInput
                        label=""
                        value={statusFilter}
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
            </div>
        </div>
    );
}
