'use client';

import { Search } from 'lucide-react';
import { LocationResponse } from '@/types/user';
import LocationFilterSingle from '@/components/superadmin/admins/parts/LocationFilterSingle';

interface StaffFiltersProps {
    searchTerm: string;
    filterRole: string;
    filterStatus: string;
    locations: LocationResponse[];
    selectedLocationId: string | null;
    onSearchChange: (value: string) => void;
    onRoleChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onLocationChange: (locationId: string | null) => void;
}

export default function StaffFilters({
    searchTerm,
    filterRole,
    filterStatus,
    locations,
    selectedLocationId,
    onSearchChange,
    onRoleChange,
    onStatusChange,
    onLocationChange
}: StaffFiltersProps) {
    return (
        <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Search staff by name, email, or ID..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
            </div>
            <select
                value={filterRole}
                onChange={(e) => onRoleChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
                <option value="">All Roles</option>
                <option value="operator">Operator</option>
                <option value="doctor">Doctor</option>
            </select>
            <LocationFilterSingle
                locations={locations}
                selectedLocationId={selectedLocationId}
                onChange={onLocationChange}
            />
            <select
                value={filterStatus}
                onChange={(e) => onStatusChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
            >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </select>
        </div>
    );
}
