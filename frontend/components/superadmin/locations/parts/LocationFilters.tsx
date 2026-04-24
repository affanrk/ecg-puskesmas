'use client';

import { Search } from 'lucide-react';

interface LocationFiltersProps {
    searchTerm: string;
    filterType: string;
    filterStatus: string;
    onSearchChange: (value: string) => void;
    onTypeChange: (value: string) => void;
    onStatusChange: (value: string) => void;
}

export default function LocationFilters({
    searchTerm,
    filterType,
    filterStatus,
    onSearchChange,
    onTypeChange,
    onStatusChange
}: LocationFiltersProps) {
    return (
        <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Search locations..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
            </div>
            <select
                value={filterType}
                onChange={(e) => onTypeChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 cursor-pointer"
            >
                <option value="">All Types</option>
                <option value="PUSKESMAS">Puskesmas</option>
                <option value="CLINIC">Clinic</option>
                <option value="HOSPITAL">Hospital</option>
                <option value="LABORATORY">Laboratory</option>
            </select>
            <select
                value={filterStatus}
                onChange={(e) => onStatusChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 cursor-pointer cursor-pointer"
            >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </select>
        </div>
    );
}
