'use client';

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { api } from '@/services/api';
import { User } from '@/store/useStore';
import {
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    RefreshCcw,
    UserX,
    Plus
} from 'lucide-react';
import clsx from 'clsx';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import EditUserModal from '@/components/admin/EditUserModal';
import CreateUserModal from '@/components/admin/CreateUserModal';
import { formatDateShort, parseApiError } from '@/utils/helpers';
import { useToast } from '@/hooks/useToast';

const UserTableRow = memo(({
    user,
    onEdit,
    onDelete
}: {
    user: User;
    onEdit: (u: User) => void;
    onDelete: (u: User) => void;
}) => (
    <tr className="hover:bg-rose-50/30 transition-colors group h-[48px]">
        <td className="px-5 whitespace-nowrap">
            <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center text-[10px] font-black group-hover:bg-rose-600 transition-colors shadow-sm">
                    {user.username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                    <p className="text-[11px] font-black text-slate-800 group-hover:text-rose-700 transition-colors truncate max-w-[180px]">{user.username}</p>
                    <p className="text-[9px] font-bold text-slate-400">{user.email}</p>
                </div>
            </div>
        </td>
        <td className="px-5 whitespace-nowrap">
            <div className="flex items-center gap-2">
                <span className={clsx(
                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border",
                    user.role === 'admin' ? "bg-slate-900 text-white border-slate-900" :
                        user.is_doctor ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            user.is_operator ? "bg-blue-50 text-blue-600 border-blue-100" :
                                user.is_patient ? "bg-rose-50 text-rose-600 border-rose-100" :
                                    "bg-slate-50 text-slate-500 border-slate-100"
                )}>
                    {user.role === 'admin' ? 'Admin' :
                        user.is_doctor ? 'Specialist' :
                            user.is_operator ? 'Operator' :
                                user.is_patient ? 'Patient' : 'User'}
                </span>
            </div>
        </td>
        <td className="px-5 whitespace-nowrap">
            <div className={clsx(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border",
                user.is_active
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : "bg-slate-50 text-slate-400 border-slate-100"
            )}>
                <div className={clsx("w-1.5 h-1.5 rounded-full", user.is_active ? "bg-emerald-500" : "bg-slate-400")} />
                {user.is_active ? "Active" : "Inactive"}
            </div>
        </td>
        <td className="px-5 whitespace-nowrap">
            <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-tighter">
                {formatDateShort(user.created_dt as string)}
            </span>
        </td>
        <td className="px-5 whitespace-nowrap text-right pr-6">
            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onEdit(user)}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-[0.98] border border-blue-100/50"
                    title="Edit User"
                >
                    Edit
                </button>
                <button
                    onClick={() => onDelete(user)}
                    className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-[0.98] border border-rose-100/50"
                    title="Delete User"
                >
                    Delete
                </button>
            </div>
        </td>
    </tr>
));

UserTableRow.displayName = 'UserTableRow';

export default function UserManagementPage() {
    const showToast = useToast((state) => state.show);
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [page, setPage] = useState(1);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const fetchUsers = useCallback(async () => {
        try {
            const data = await api.fetchUsers({
                search,
                role: roleFilter || undefined,
                limit: 100
            });
            setUsers(data);
        } catch (err) {
            const { message } = parseApiError(err);
            console.error(message);
        } finally {
            setIsLoading(false);
        }
    }, [search, roleFilter]);

    const handleCreate = useCallback(async (data: Record<string, unknown>) => {
        try {
            await api.createUser(data);
            fetchUsers();
            showToast("User created successfully", "success");
            return { success: true };
        } catch (err) {
            const { message, fieldErrors } = parseApiError(err);
            const finalFieldErrors = { ...(fieldErrors || {}) };
            if (message.toLowerCase().includes('username')) finalFieldErrors.username = message;
            if (message.toLowerCase().includes('email')) finalFieldErrors.email = message;
            if (message.toLowerCase().includes('nik')) finalFieldErrors.nik = message;

            return { success: false, message, fieldErrors: finalFieldErrors };
        }
    }, [showToast, fetchUsers]);

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            fetchUsers();
        }, 400);
        return () => clearTimeout(timer);
    }, [fetchUsers]);

    const totalPages = useMemo(() => Math.ceil(users.length / rowsPerPage) || 1, [users.length, rowsPerPage]);
    const paginatedUsers = useMemo(() => users.slice((page - 1) * rowsPerPage, page * rowsPerPage), [users, page, rowsPerPage]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [totalPages, page]);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.contentRect.height;
                const headerHeight = 48;
                const availableHeight = height - headerHeight;
                const idealRows = 10;
                const rowHeight = 48;

                const calculatedRows = Math.max(1, Math.floor(availableHeight / rowHeight));
                setRowsPerPage(calculatedRows >= idealRows ? idealRows : calculatedRows);
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const handleUpdate = useCallback(async (userId: string, data: Partial<User>) => {
        try {
            await api.updateUser(userId, data);
            fetchUsers();
            showToast("User account updated successfully", "success");
            return { success: true };
        } catch (err) {
            const { message, fieldErrors, status } = parseApiError(err);
            const finalFieldErrors = { ...(fieldErrors || {}) };

            if (message.toLowerCase().includes('username')) finalFieldErrors.username = message;
            if (message.toLowerCase().includes('email')) finalFieldErrors.email = message;
            if (message.toLowerCase().includes('nik')) finalFieldErrors.nik = message;

            if (status !== 400 && status !== 422) {
                showToast(message || "Failed to update user account", "error");
            }
            return { success: false, message, fieldErrors: finalFieldErrors };
        }
    }, [fetchUsers, showToast]);

    const handleDelete = useCallback(async () => {
        if (!deletingUser?.id) return;
        try {
            await api.deleteUser(deletingUser.id);
            fetchUsers();
            setDeletingUser(null);
            showToast("User account deleted successfully", "success");
        } catch (err) {
            const { message } = parseApiError(err);
            showToast(message || "Failed to delete user account", "error");
        }
    }, [deletingUser, fetchUsers, showToast]);

    const handleSetEditingUser = useCallback((u: User) => setEditingUser(u), []);
    const handleSetDeletingUser = useCallback((u: User) => setDeletingUser(u), []);

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 p-6 lg:p-8 gap-6 overflow-hidden animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <p className="text-sm font-medium text-slate-500">Manage accounts, roles, and access permissions.</p>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-rose-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <Filter size={14} />
                        </div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:border-rose-500 outline-none appearance-none cursor-pointer hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <option value="">All Access</option>
                            <option value="user">User (Standard Account)</option>
                            <option value="patient">Patient</option>
                            <option value="operator">Operator (Nurse / General Doctor)</option>
                            <option value="doctor">Specialist (Doctor Specialist)</option>
                        </select>
                    </div>

                    <button
                        onClick={() => setIsCreatingUser(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 shrink-0"
                    >
                        <Plus size={16} /> <span className="hidden sm:inline">New User</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0 relative">
                {isLoading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center py-20">
                        <RefreshCcw size={40} className="text-rose-200 animate-spin mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Users...</p>
                    </div>
                ) : paginatedUsers.length === 0 ? (
                    <div className="h-full w-full flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-50 rounded-xl bg-white/50 animate-in fade-in duration-500">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-3">
                            <UserX size={24} />
                        </div>
                        <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">No Users Found</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Try adjusting your search or filters
                        </p>
                    </div>
                ) : (
                    <>
                        <div ref={containerRef} className="flex-1 overflow-x-auto no-scrollbar relative z-10 overflow-y-hidden">
                            <table className="w-full text-left border-collapse table-auto h-full">
                                <thead className="bg-slate-50/80 text-slate-400 sticky top-0 z-10 backdrop-blur-sm h-[48px]">
                                    <tr>
                                        <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">User Identity</th>
                                        <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Access</th>
                                        <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Status</th>
                                        <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Joined</th>
                                        <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap text-right pr-8">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {paginatedUsers.map((user) => (
                                        <UserTableRow
                                            key={user.id}
                                            user={user}
                                            onEdit={handleSetEditingUser}
                                            onDelete={handleSetDeletingUser}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-8 py-3 border-t border-slate-50 bg-white relative z-20 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Page <span className="text-slate-800">{page}</span> of <span className="text-slate-800">{totalPages}</span>
                                </span>
                                <div className="h-4 w-px bg-slate-200"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span className="text-amber-600">{users.length}</span> Total Users
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-rose-600 hover:border-rose-200"
                                >
                                    <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-rose-600 hover:border-rose-200"
                                >
                                    <ChevronRight className="w-4 h-4" strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={handleUpdate}
                />
            )}

            {isCreatingUser && (
                <CreateUserModal
                    onClose={() => setIsCreatingUser(false)}
                    onSave={handleCreate}
                />
            )}

            <ConfirmationModal
                isOpen={!!deletingUser}
                onClose={() => setDeletingUser(null)}
                onConfirm={handleDelete}
                title="Delete User Account?"
                message={
                    <div className="space-y-3">
                        <p className="text-sm text-slate-500 font-medium leading-relaxed">
                            Are you sure you want to permanently delete <span className="font-bold text-slate-700">@{deletingUser?.username}</span>?
                        </p>
                        <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                            <p className="text-[11px] font-bold text-rose-600 leading-relaxed uppercase tracking-tight">
                                This action is irreversible. All associated data, including patient profiles, clinical ECG sessions, and historical records, will be permanently removed from the system.
                            </p>
                        </div>
                    </div>
                }
                confirmText="Delete Account"
                isDestructive={true}
            />
        </div>
    );
}
