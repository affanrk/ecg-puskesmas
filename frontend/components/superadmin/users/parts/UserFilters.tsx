'use client';

import { Search } from 'lucide-react';
import { LocationResponse } from '@/types/user';
import LocationFilterMulti from './LocationFilterMulti';

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
    return (
        <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
            </div>
            <LocationFilterMulti
                locations={locations}
                selectedLocationIds={selectedLocationIds}
                onChange={onLocationChange}
            />
            <select
                value={roleFilter}
                onChange={(e) => onRoleChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 cursor-pointer"
            >
                <option value="">All Roles</option>
                <option value="patient">Patients</option>
                <option value="operator">Operators</option>
                <option value="doctor">Doctors</option>
            </select>
            <select
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 cursor-pointer"
            >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </select>
        </div>
    );
}
