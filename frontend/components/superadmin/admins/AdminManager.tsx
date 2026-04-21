'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { User, LocationResponse, AdminProfileData } from '@/types/user';
import { useToast } from '@/hooks/useToast';
import { Plus, ShieldCheck, MapPin, RefreshCw, X, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { globalEventBus } from '@/services/events';
import { EVENTS } from '@/config/constants';
import StandardInput from '@/components/shared/StandardInput';
import SelectInput from '@/components/shared/SelectInput';
import { useStore } from '@/store/useStore';
import clsx from 'clsx';

type ModalMode = 'create' | 'reassign' | null;

export default function AdminManager() {
    const { show: toast } = useToast();
    const setAdminLoading = useStore(state => state.setAdminLoading);
    const [admins, setAdmins] = useState<User[]>([]);
    const [locations, setLocations] = useState<LocationResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        full_name: '',
        location_id: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [page, setPage] = useState(1);
    const rowsPerPage = 10;
    const totalPages = Math.ceil(admins.length / rowsPerPage) || 1;
    const paginatedAdmins = admins.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [adminRes, locRes] = await Promise.all([
                api.fetchAdmins({ limit: 1000, t: Date.now() }),
                api.fetchLocations({ limit: 1000, t: Date.now() })
            ]);
            setAdmins(Array.isArray(adminRes) ? adminRes : adminRes?.data || []);
            setLocations(Array.isArray(locRes) ? locRes : locRes?.data || []);
        } catch {
            toast('Failed to load admins', 'error');
        } finally {
            setLoading(false);
            setAdminLoading(false);
        }
    }, [toast, setAdminLoading]);

    useEffect(() => {
        loadData();
        
        const handleRefreshEvent = () => loadData();
        globalEventBus.on(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefreshEvent);
        return () => {
            globalEventBus.off(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefreshEvent);
        };
    }, [loadData]);

    const openModal = (mode: 'create' | 'reassign', admin?: User) => {
        setModalMode(mode);
        if (mode === 'reassign' && admin) {
            setSelectedAdmin(admin);
            setFormData({ ...formData, location_id: admin.admin_profile?.location_id || admin.location_id || '' });
        } else {
            setSelectedAdmin(null);
            setFormData({ username: '', email: '', password: '', full_name: '', location_id: '' });
        }
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedAdmin(null);
        setFormData({ username: '', email: '', password: '', full_name: '', location_id: '' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                full_name: formData.full_name?.trim() || null,
            };

            if (modalMode === 'create') {
                await api.createSuperAdminUser(payload as any);
                toast('Admin account created', 'success');
            } else if (modalMode === 'reassign' && selectedAdmin) {
                if (!formData.location_id) throw new Error("Location ID required");
                await api.reassignAdminLocation(selectedAdmin.id as string, formData.location_id);
                toast('Admin reassigned to new location', 'success');
            }
            closeModal();
            loadData();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { detail?: string } }, message?: string };
            toast(error?.response?.data?.detail || error?.message || 'Operation failed', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 p-6 lg:p-8 gap-6 overflow-hidden animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <ShieldCheck className="text-violet-600" /> Admin Directory
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Manage local administrators and assign their controlling locations.
                    </p>
                </div>
                <button
                    onClick={() => openModal('create')}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all"
                >
                    <Plus size={16} /> New Admin Target
                </button>
            </div>

            <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50/80 text-slate-400 sticky top-0 z-10 backdrop-blur-sm h-[48px]">
                            <tr>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Admin Profile</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Role</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Status</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Assigned Location</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap text-right pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="h-64 align-middle">
                                        <div className="flex flex-col items-center justify-center">
                                            <RefreshCcw size={40} className="text-zinc-300 animate-spin mb-4" />
                                            <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Syncing Data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : admins.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="h-64 align-middle">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <ShieldCheck size={48} className="mb-4 opacity-20" />
                                            <p className="font-medium text-sm">No administrators found</p>
                                            <p className="text-xs mt-1 opacity-60">Register your first admin target above.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedAdmins.map((admin) => {
                                    const prof = admin.admin_profile as AdminProfileData | undefined;
                                    const fullName = prof?.full_name || '-';
                                    return (
                                        <tr key={admin.id} className="hover:bg-violet-50/30 transition-colors group h-[48px]">
                                            <td className="px-5 whitespace-nowrap">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center text-[10px] font-black group-hover:bg-violet-600 transition-colors shadow-sm">
                                                        {admin.username.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-800 group-hover:text-violet-700 transition-colors truncate max-w-[200px]">
                                                            {admin.admin_profile?.full_name || admin.username}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-slate-400 truncate">
                                                            {admin.admin_profile?.full_name ? `@${admin.username}` : (admin.email || "No Email")}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border bg-slate-900 text-white border-slate-900">
                                                        Admin
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 whitespace-nowrap">
                                                <div className={clsx(
                                                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border",
                                                    admin.is_active
                                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                        : "bg-slate-50 text-slate-400 border-slate-100"
                                                )}>
                                                    <div className={clsx("w-1.5 h-1.5 rounded-full", admin.is_active ? "bg-emerald-500" : "bg-slate-400")} />
                                                    {admin.is_active ? "Active" : "Inactive"}
                                                </div>
                                            </td>
                                            <td className="px-5 whitespace-nowrap">
                                                {(() => {
                                                    const locId = admin.admin_profile?.location_id || admin.location_id;
                                                    const loc = locations.find(l => l.id === locId);
                                                    return loc ? (
                                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-50 text-[10px] font-bold text-slate-600 border border-slate-100">
                                                            <MapPin size={12} className="text-slate-400" /> {loc.name}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-400 italic">Unassigned</span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-5 whitespace-nowrap text-right pr-6">
                                                <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openModal('reassign', admin)}
                                                        className="px-3 py-1.5 bg-violet-50 text-violet-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-violet-600 hover:text-white transition-all active:scale-[0.98] border border-violet-100/50 cursor-pointer flex items-center gap-1.5"
                                                        title="Reassign Location"
                                                    >
                                                        <RefreshCw size={10} /> Reassign
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && admins.length > 0 && (
                    <div className="px-8 py-3 border-t border-slate-200 bg-slate-50 relative z-20 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                Page <span className="text-slate-800">{page}</span> of <span className="text-slate-800">{totalPages}</span>
                            </span>
                            <div className="h-4 w-px bg-slate-300"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <span className="text-violet-600">{admins.length}</span> Total Admins
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

            {modalMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">
                                {modalMode === 'create' ? 'Register Admin User' : 'Reassign Admin Location'}
                            </h3>
                            <button onClick={closeModal} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {modalMode === 'create' && (
                                <>
                                    <StandardInput
                                        label="Username" required
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        placeholder="e.g. jdoe (Required)"
                                    />
                                    <StandardInput
                                        label="Email" required type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="e.g. user@puskesmas.id (Required)"
                                    />
                                    <StandardInput
                                        label="Password" required type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Secure password (Required)"
                                    />
                                    <StandardInput
                                        label="Full Name"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        placeholder="e.g. Dr. John Doe (Optional)"
                                    />
                                </>
                            )}

                            <SelectInput
                                label="Target Location"
                                required
                                value={formData.location_id}
                                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                                options={[
                                    { value: '', label: 'Select Location... (Required)' },
                                    ...locations.map(l => ({ value: l.id, label: l.name }))
                                ]}
                            />

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !formData.location_id}
                                    className="px-6 py-2 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving...' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
