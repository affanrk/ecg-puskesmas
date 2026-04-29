import { Search, Filter, Plus } from 'lucide-react';
import StandardInput from '@/components/shared/StandardInput';
import SelectInput from '@/components/shared/SelectInput';

interface UserManagementFiltersProps {
    search: string;
    setSearch: (value: string) => void;
    roleFilter: string;
    setRoleFilter: (value: string) => void;
    onCreateUser: () => void;
}

export default function UserManagementFilters({
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    onCreateUser
}: UserManagementFiltersProps) {
    const roleOptions = [
        { value: '', label: 'All Access' },
        { value: 'user', label: 'User (Standard Account)' },
        { value: 'patient', label: 'Patient' },
        { value: 'operator', label: 'Operator (Nurse / General Doctor)' },
        { value: 'doctor', label: 'Specialist (Doctor Specialist)' }
    ];

    return (
        <div className="h-[64px] shrink-0 border-b border-slate-100 flex items-center px-8 bg-slate-50/50 gap-8">
            <div className="flex items-center gap-6 h-full shrink-0">
                <p className="text-sm font-medium text-slate-500">Manage accounts, roles, and access permissions.</p>
            </div>

            <div className="w-px h-6 bg-slate-200 shrink-0" />

            <div className="flex-1 flex items-center justify-end min-w-0 gap-3">
                <div className="w-64">
                    <StandardInput
                        label=""
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
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
                        value={roleFilter}
                        onChange={(e) => {
                            const value = typeof e === 'string' ? e : e.target.value;
                            setRoleFilter(value);
                        }}
                        options={roleOptions}
                        placeholder="All Access"
                        searchable={true}
                        colorTheme="rose"
                        className="pl-10"
                    />
                </div>

                <button
                    onClick={onCreateUser}
                    className="flex items-center gap-2 px-4 h-[42px] bg-slate-900 hover:bg-rose-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
                >
                    <Plus size={16} /> <span className="hidden sm:inline">New User</span>
                </button>
            </div>
        </div>
    );
}

