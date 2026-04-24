'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/services/api';
import { User, LocationResponse } from '@/types/user';
import { useToast } from '@/hooks/useToast';
import { Users, RefreshCcw, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { globalEventBus } from '@/services/events';
import { EVENTS } from '@/config/constants';
import { useStore } from '@/store/useStore';
import UserFilters from './parts/UserFilters';
import UserTableRow from './parts/UserTableRow';

export default function UserManager() {
    const { show: toast } = useToast();
    const setAdminLoading = useStore(state => state.setAdminLoading);
    const [users, setUsers] = useState<User[]>([]);
    const [locations, setLocations] = useState<LocationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const initialized = useRef(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);

    const [page, setPage] = useState(1);
    const rowsPerPage = 10;

    const filteredUsers = users.filter(user => {
        const matchesSearch = !searchTerm || 
            user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.id && user.id.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesRole = !roleFilter || user.role === roleFilter;
        const matchesStatus = !statusFilter || 
            (statusFilter === 'active' && user.is_active) ||
            (statusFilter === 'inactive' && !user.is_active);

        const matchesLocation = selectedLocationIds.length === 0 || 
            (user.location_id && selectedLocationIds.includes(user.location_id)) ||
            (user.operator_profile?.location_id && selectedLocationIds.includes(user.operator_profile.location_id)) ||
            (user.doctor_profile?.location_id && selectedLocationIds.includes(user.doctor_profile.location_id)) ||
            (user.admin_profile?.location_id && selectedLocationIds.includes(user.admin_profile.location_id));

        return matchesSearch && matchesRole && matchesStatus && matchesLocation;
    });

    const totalPages = Math.ceil(filteredUsers.length / rowsPerPage) || 1;
    const paginatedUsers = filteredUsers.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const [usersRes, locRes] = await Promise.all([
                api.fetchSuperAdminUsers({ limit: 1000, t: Date.now() }),
                api.fetchLocations({ limit: 1000, t: Date.now() })
            ]);
            setUsers(Array.isArray(usersRes) ? usersRes : usersRes?.data || []);
            setLocations(Array.isArray(locRes) ? locRes : locRes?.data || []);
        } catch {
            toast('Failed to load users', 'error');
        } finally {
            setLoading(false);
            setAdminLoading(false);
        }
    }, [toast, setAdminLoading]);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        loadUsers();

        const handleRefreshEvent = () => loadUsers();
        globalEventBus.on(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefreshEvent);
        return () => {
            globalEventBus.off(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefreshEvent);
        };
    }, [loadUsers]);

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 p-6 lg:p-8 gap-6 overflow-hidden animate-in fade-in duration-500">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-medium text-blue-900">Read-Only User View</p>
                    <p className="text-xs text-blue-700 mt-1">
                        SuperAdmin can view users for oversight purposes. To manage users (activate/deactivate/delete), please contact the location Admin.
                    </p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <UserFilters
                    searchTerm={searchTerm}
                    roleFilter={roleFilter}
                    statusFilter={statusFilter}
                    locations={locations}
                    selectedLocationIds={selectedLocationIds}
                    onSearchChange={setSearchTerm}
                    onRoleChange={setRoleFilter}
                    onStatusChange={setStatusFilter}
                    onLocationChange={setSelectedLocationIds}
                />
            </div>

            <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50/80 text-slate-400 sticky top-0 z-10 backdrop-blur-sm h-[48px]">
                            <tr>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">User Details</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">System Role</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Account Status</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Activation</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Joined Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="h-64 align-middle">
                                        <div className="flex flex-col items-center justify-center">
                                            <RefreshCcw size={40} className="text-zinc-300 animate-spin mb-4" />
                                            <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Syncing Data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="h-64 align-middle">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <Users size={48} className="mb-4 opacity-20" />
                                            <p className="font-medium text-sm">No users found</p>
                                            <p className="text-xs mt-1 opacity-60">Try adjusting your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedUsers.map((user) => (
                                    <UserTableRow
                                        key={user.id}
                                        user={user}
                                        readOnly={true}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && filteredUsers.length > 0 && (
                    <div className="px-8 py-3 border-t border-slate-200 bg-slate-50 relative z-20 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                Page <span className="text-slate-800">{page}</span> of <span className="text-slate-800">{totalPages}</span>
                            </span>
                            <div className="h-4 w-px bg-slate-300"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <span className="text-violet-600">{filteredUsers.length}</span> Users
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-violet-600 hover:border-violet-200 cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                            </button>
                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-violet-600 hover:border-violet-200 cursor-pointer"
                            >
                                <ChevronRight className="w-4 h-4" strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
