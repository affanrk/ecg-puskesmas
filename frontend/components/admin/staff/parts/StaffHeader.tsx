'use client';

import { Plus, Search, Filter } from 'lucide-react';
import SelectInput from '@/components/shared/SelectInput';
import StandardInput from '@/components/shared/StandardInput';
import { operatorRoleOptions, doctorSpecialtyOptions } from '@/data';

interface StaffHeaderProps {
    searchTerm: string;
    filterRole: string;
    filterStatus: string;
    onSearchChange: (value: string) => void;
    onRoleChange: (value: string) => void;
    onStatusChange: (value: string) => void;
    onCreateNew: () => void;
}

export default function StaffHeader({
    searchTerm,
    filterRole,
    filterStatus,
    onSearchChange,
    onRoleChange,
    onStatusChange,
    onCreateNew,
}: StaffHeaderProps) {
    const roleOptions = [
        { value: '', label: 'All Staff' },
        { value: 'operator', label: 'All Operators' },
        ...operatorRoleOptions.map(opt => ({
            value: `operator:${opt.value}`,
            label: `  └─ ${opt.label}`
        })),
        { value: 'doctor', label: 'All Doctors' },
        ...doctorSpecialtyOptions.map(opt => ({
            value: `doctor:${opt.value}`,
            label: `  └─ ${opt.label}`
        })),
    ];

    const statusOptions = [
        { value: '', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
    ];

    return (
        <div className="h-[64px] shrink-0 border-b border-slate-100 flex items-center px-8 bg-slate-50/50 gap-8">
            <div className="flex items-center gap-4 h-full shrink-0">
                <div className="w-40">
                    <SelectInput
                        label=""
                        value={filterStatus}
                        onChange={(e) => onStatusChange(e.target.value)}
                        options={statusOptions}
                        placeholder="All Status"
                        colorTheme="rose"
                    />
                </div>
            </div>

            <div className="w-px h-6 bg-slate-200 shrink-0" />

            <div className="flex-1 flex items-center justify-end min-w-0 gap-3">
                <div className="w-64">
                    <StandardInput
                        label=""
                        type="text"
                        placeholder="Search staff..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        icon={<Search size={14} />}
                        colorTheme="rose"
                    />
                </div>
                
                <div className="w-48 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10">
                        <Filter size={14} />
                    </div>
                    <SelectInput
                        label=""
                        value={filterRole}
                        onChange={(e) => {
                            const value = typeof e === 'string' ? e : e.target.value;
                            onRoleChange(value);
                        }}
                        options={roleOptions}
                        placeholder="All Staff"
                        searchable={true}
                        colorTheme="rose"
                        className="pl-10"
                    />
                </div>

                <button
                    onClick={onCreateNew}
                    className="flex items-center gap-2 px-4 h-[42px] bg-slate-900 hover:bg-rose-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
                >
                    <Plus size={16} /> <span className="hidden sm:inline">New Staff</span>
                </button>
            </div>
        </div>
    );
}
