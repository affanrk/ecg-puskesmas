'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { User, UserFormPayload, WalkinPatient, WalkinPatientPayload, ConvertWalkinPayload } from '@/types/user';
import {
    Search,
    Filter,
    RefreshCcw,
    Plus
} from 'lucide-react';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import EditUserModal from '@/components/admin/users/parts/EditUserModal';
import CreateUserModal from '@/components/admin/users/parts/CreateUserModal';
import WalkinPatientModal from '@/components/admin/users/parts/WalkinPatientModal';
import { parseApiError } from '@/utils/helpers';
import { useToast } from '@/hooks/useToast';
import { useStore } from '@/store/useStore';
import { globalEventBus } from '@/services/events';
import { EVENTS } from '@/config/constants';
import UserManagementTable from '@/components/admin/users/UserManagementTable';

export default function UserManagementPage() {
    const showToast = useToast((state) => state.show);
    const { setAdminLoading } = useStore();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setAdminLoading(isLoading);
    }, [isLoading, setAdminLoading]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editingWalkin, setEditingWalkin] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const [usersData, walkinsData] = await Promise.all([
                api.fetchUsers({ search, role: roleFilter || undefined, limit: 100 }),
                api.fetchAdminPatients({ search, limit: 100 })
            ]);

            let combined: User[] = [...usersData];

            if (!roleFilter || roleFilter === 'patient') {
                const walkins = walkinsData.items || [];
                const formattedWalkins: User[] = walkins.map((w: WalkinPatient) => ({
                    id: w.id,
                    username: 'walk-in',
                    email: 'N/A',
                    role: 'patient',
                    is_patient: true,
                    is_walkin: true,
                    is_active: w.status === 'ACTIVE',
                    is_activated: 1,
                    patient_profile: {
                        full_name: w.full_name,
                        nik: w.nik,
                        pob: w.pob,
                        dob: w.dob,
                        gender: w.gender,
                        address: w.address,
                        contact_number: w.contact_number,
                        medical_history: w.medical_history
                    },
                    created_dt: w.created_dt,
                    changed_dt: w.changed_dt
                }));
                combined = [...combined, ...formattedWalkins];
                combined.sort((a, b) => new Date(b.created_dt as string).getTime() - new Date(a.created_dt as string).getTime());
            }

            setUsers(combined);
        } catch (err) {
            const { message } = parseApiError(err as Error);
            console.error(message);
            showToast(message, "error");
        } finally {
            setIsLoading(false);
            setAdminLoading(false);
        }
    }, [search, roleFilter, showToast, setAdminLoading]);

    const handleCreate = useCallback(async (data: UserFormPayload) => {
        try {
            await api.createUser(data);
            fetchUsers();
            showToast("User created successfully", "success");
            return { success: true };
        } catch (err) {
            const { message, fieldErrors } = parseApiError(err as Error);
            return { success: false, message, fieldErrors };
        }
    }, [showToast, fetchUsers]);

    useEffect(() => {
        const handleRefresh = () => {
            fetchUsers();
            showToast("User management list updated", "success");
        };
        globalEventBus.on(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefresh);
        return () => {
            globalEventBus.off(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefresh);
        };
    }, [fetchUsers, showToast]);

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            fetchUsers();
        }, 400);
        return () => clearTimeout(timer);
    }, [fetchUsers]);

    useEffect(() => {
        setPage(1);
    }, [search, roleFilter]);

    useEffect(() => {
        const totalPages = Math.ceil(users.length / rowsPerPage) || 1;
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [users.length, rowsPerPage, page]);

    const handleUpdate = useCallback(async (userId: string, data: Partial<User>) => {
        try {
            await api.updateUser(userId, data);
            fetchUsers();
            showToast("User account updated successfully", "success");
            return { success: true };
        } catch (err) {
            const { message, fieldErrors, status } = parseApiError(err as Error);

            if (status !== 400 && status !== 422 && message) {
                showToast(message || "Failed to update user account", "error");
            }
            return { success: false, message, fieldErrors };
        }
    }, [fetchUsers, showToast]);

    const handleUpdateWalkin = useCallback(async (id: string, data: WalkinPatientPayload) => {
        try {
            await api.updateAdminWalkinPatient(id, data);
            fetchUsers();
            showToast("Walk-in patient updated successfully", "success");
            setEditingWalkin(null);
            return { success: true };
        } catch (err) {
            const { message } = parseApiError(err as Error);
            showToast(message || "Failed to update walk-in patient", "error");
            return { success: false, message };
        }
    }, [fetchUsers, showToast]);

    const handleConvertWalkin = useCallback(async (id: string, data: ConvertWalkinPayload) => {
        try {
            await api.convertAdminWalkinPatient(id, data);
            fetchUsers();
            showToast("Walk-in patient converted to user account successfully", "success");
            setEditingWalkin(null);
            return { success: true };
        } catch (err) {
            const { message } = parseApiError(err as Error);
            showToast(message || "Failed to convert walk-in patient", "error");
            return { success: false, message };
        }
    }, [fetchUsers, showToast]);

    const handleDelete = useCallback(async () => {
        if (!deletingUser?.id) return;
        setIsDeleting(true);
        try {
            if (deletingUser.is_walkin) {
                await api.deleteAdminWalkinPatient(deletingUser.id);
            } else {
                await api.deleteUser(deletingUser.id);
            }
            fetchUsers();
            setDeletingUser(null);
            showToast("Account deleted successfully", "success");
        } catch (err) {
            const { message } = parseApiError(err as Error);
            showToast(message || "Failed to delete user account", "error");
        } finally {
            setIsDeleting(false);
        }
    }, [deletingUser, fetchUsers, showToast]);

    const handleSetEditingUser = useCallback((u: User) => {
        if (u.is_walkin) {
            setEditingWalkin(u);
        } else {
            setEditingUser(u);
        }
    }, []);
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
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
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
                ) : (
                    <UserManagementTable
                        users={users}
                        rowsPerPage={rowsPerPage}
                        setRowsPerPage={setRowsPerPage}
                        currentPage={page}
                        setCurrentPage={setPage}
                        onEdit={handleSetEditingUser}
                        onDelete={handleSetDeletingUser}
                    />
                )}
            </div>

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={handleUpdate}
                />
            )}

            {editingWalkin && (
                <WalkinPatientModal
                    patient={editingWalkin}
                    onClose={() => setEditingWalkin(null)}
                    onSave={handleUpdateWalkin}
                    onConvert={handleConvertWalkin}
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
                isLoading={isDeleting}
            />
        </div>
    );
}
