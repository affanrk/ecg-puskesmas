'use client';

import { useState, useEffect, useCallback } from 'react';

import { Users, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';

import UserFilters from './parts/UserFilters';
import UserTableRow from './parts/UserTableRow';
import { EVENTS } from '@/config/constants';
import { useToast } from '@/hooks/useToast';
import { api } from '@/services';
import { globalEventBus } from '@/services/websocket/events';
import { useStore } from '@/store/useStore';
import { User, LocationResponse } from '@/types/user';

export default function UserManager() {
    const { show: toast } = useToast();
    const setAdminLoading = useStore(state => state.setAdminLoading);
    const [users, setUsers] = useState<User[]>([]);
    const [locations, setLocations] = useState<LocationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        setAdminLoading(loading);
    }, [loading, setAdminLoading]);
    
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
                api.fetchSuperAdminLocations({ limit: 1000, t: Date.now() })
            ]);
            setUsers(Array.isArray(usersRes) ? usersRes : usersRes?.data || []);
            setLocations(Array.isArray(locRes) ? locRes : locRes?.data || []);
            return true;
        } catch {
            toast('Failed to load users', 'error');
            return false;
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const handleRefresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
        toast('Users refreshed successfully', 'success');
    }, [toast]);

    useEffect(() => {
        globalEventBus.on(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefresh);
        return () => globalEventBus.off(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefresh);
    }, [handleRefresh]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers, refreshKey]);

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden animate-in fade-in duration-500">
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

            <div className="flex-1 p-4 lg:px-10 lg:py-6 bg-slate-50/30 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
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
        </div>
    );
}
