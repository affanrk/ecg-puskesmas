'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { User } from '@/types/user';
import { useToast } from '@/hooks/useToast';
import { Users, Filter, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { globalEventBus } from '@/services/events';
import { EVENTS } from '@/config/constants';
import { useStore } from '@/store/useStore';
import clsx from 'clsx';

export default function UserManager() {
    const { show: toast } = useToast();
    const setAdminLoading = useStore(state => state.setAdminLoading);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [roleFilter, setRoleFilter] = useState('');

    const [page, setPage] = useState(1);
    const rowsPerPage = 10;
    const totalPages = Math.ceil(users.length / rowsPerPage) || 1;
    const paginatedUsers = users.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.fetchSuperAdminUsers({
                limit: 1000,
                role: roleFilter || undefined,
                t: Date.now()
            });
            setUsers(Array.isArray(res) ? res : res?.data || []);
        } catch {
            toast('Failed to load users', 'error');
        } finally {
            setLoading(false);
            setAdminLoading(false);
        }
    }, [roleFilter, toast, setAdminLoading]);

    useEffect(() => {
        loadUsers();

        const handleRefreshEvent = () => loadUsers();
        globalEventBus.on(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefreshEvent);
        return () => {
            globalEventBus.off(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefreshEvent);
        };
    }, [loadUsers]);

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 p-6 lg:p-8 gap-6 overflow-hidden animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Users className="text-violet-600" /> Global User Database
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        A full registry of every registered user across the entire platform.
                    </p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                    <Filter size={16} className="text-slate-400 ml-2" />
                    <select
                        className="bg-transparent border-none text-sm font-bold text-slate-600 focus:ring-0 outline-none pr-8 cursor-pointer"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="">All Roles</option>
                        <option value="patient">Patients</option>
                        <option value="operator">Operators</option>
                        <option value="doctor">Doctors</option>
                        <option value="admin">Admins</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50/80 text-slate-400 sticky top-0 z-10 backdrop-blur-sm h-[48px]">
                            <tr>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">User Details</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">System Role</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Account Status</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap text-right pr-6">Joined Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="h-64 align-middle">
                                        <div className="flex flex-col items-center justify-center">
                                            <RefreshCcw size={40} className="text-zinc-300 animate-spin mb-4" />
                                            <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Syncing Data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="h-64 align-middle">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <Users size={48} className="mb-4 opacity-20" />
                                            <p className="font-medium text-sm">No users found</p>
                                            <p className="text-xs mt-1 opacity-60">No users match the current criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedUsers.map((userObj) => (
                                <tr key={userObj.id} className="hover:bg-blue-50/30 transition-colors group h-[48px]">
                                        <td className="px-5 whitespace-nowrap">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center text-[10px] font-black group-hover:bg-blue-600 transition-colors shadow-sm">
                                                    {userObj.username.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-slate-800 group-hover:text-blue-700 transition-colors truncate max-w-[200px]">{userObj.username}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 truncate">{userObj.email || "No Email"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 whitespace-nowrap">
                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border bg-slate-50 text-slate-500 border-slate-100">
                                                {userObj.role}
                                            </span>
                                        </td>
                                        <td className="px-5 whitespace-nowrap">
                                            <div className={clsx(
                                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border",
                                                userObj.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                            )}>
                                                <span className={clsx("w-1.5 h-1.5 rounded-full", userObj.is_active ? "bg-emerald-500" : "bg-slate-400")}></span>
                                                {userObj.is_active ? "Active" : "Inactive"}
                                            </div>
                                        </td>
                                        <td className="px-5 whitespace-nowrap text-right pr-6">
                                            <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-tighter">
                                                {userObj.created_dt ? new Date(userObj.created_dt).toLocaleDateString() : '-'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && users.length > 0 && (
                    <div className="px-8 py-3 border-t border-slate-200 bg-slate-50 relative z-20 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                Page <span className="text-slate-800">{page}</span> of <span className="text-slate-800">{totalPages}</span>
                            </span>
                            <div className="h-4 w-px bg-slate-300"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <span className="text-violet-600">{users.length}</span> Total Users
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
