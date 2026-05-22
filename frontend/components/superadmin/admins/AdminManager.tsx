'use client';

import { useState, useEffect, useCallback } from 'react';

import { ShieldCheck, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';

import AdminFilters from './parts/AdminFilters';
import AdminFormModal from './parts/AdminFormModal';
import AdminTableRow from './parts/AdminTableRow';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import ReviewSummaryTable from '@/components/shared/ReviewSummaryTable';
import { EVENTS } from '@/config/constants';
import { useToast } from '@/hooks/useToast';
import { api } from '@/services';
import { globalEventBus } from '@/services/websocket/events';
import { useStore } from '@/store/useStore';
import { User, LocationResponse } from '@/types/user';
import { parseApiError } from '@/utils/helpers';
import { validators } from '@/utils/validators';

type ModalMode = 'create' | 'reassign' | null;

export default function AdminManager() {
    const { show: toast } = useToast();
    const setAdminLoading = useStore(state => state.setAdminLoading);
    const [admins, setAdmins] = useState<User[]>([]);
    const [locations, setLocations] = useState<LocationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        setAdminLoading(loading);
    }, [loading, setAdminLoading]);

    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        full_name: '',
        nik: '',
        pob: '',
        dob: '',
        gender: '',
        address: '',
        contact_number: '',
        location_id: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
    const [showActivate, setShowActivate] = useState(false);
    const [showDeactivate, setShowDeactivate] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [adminToActivate, setAdminToActivate] = useState<User | null>(null);
    const [adminToDeactivate, setAdminToDeactivate] = useState<User | null>(null);
    const [adminToDelete, setAdminToDelete] = useState<User | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const rowsPerPage = 10;

    const [errors, setErrors] = useState<Record<string, string>>({});

    const filteredAdmins = admins.filter(admin => {
        const matchesSearch = !searchTerm || 
            admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            admin.admin_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = !filterStatus || 
            (filterStatus === 'active' && admin.is_active) ||
            (filterStatus === 'inactive' && !admin.is_active);

        const matchesLocation = !selectedLocationId || 
            (admin.admin_profile?.location_id === selectedLocationId) ||
            (admin.location_id === selectedLocationId);

        return matchesSearch && matchesStatus && matchesLocation;
    });

    const totalPages = Math.ceil(filteredAdmins.length / rowsPerPage) || 1;
    const paginatedAdmins = filteredAdmins.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [adminRes, locRes] = await Promise.all([
                api.fetchAdmins({ limit: 1000, t: Date.now() }),
                api.fetchSuperAdminLocations({ limit: 1000, t: Date.now() })
            ]);
            setAdmins(Array.isArray(adminRes) ? adminRes : adminRes?.data || []);
            setLocations(Array.isArray(locRes) ? locRes : locRes?.data || []);
            return true;
        } catch {
            toast('Failed to load admins', 'error');
            return false;
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const handleRefresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
        toast('Admins refreshed successfully', 'success');
    }, [toast]);

    useEffect(() => {
        globalEventBus.on(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefresh);
        return () => globalEventBus.off(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefresh);
    }, [handleRefresh]);

    useEffect(() => {
        loadData();
    }, [loadData, refreshKey]);

    const openModal = (mode: 'create' | 'reassign', admin?: User) => {
        setModalMode(mode);
        setErrors({});
        if (mode === 'reassign' && admin) {
            setSelectedAdmin(admin);
            setFormData({ 
                username: '', email: '', password: '', full_name: '', nik: '', pob: '', dob: '', 
                gender: '', address: '', contact_number: '',
                location_id: '' 
            });
        } else {
            setSelectedAdmin(null);
            setFormData({ 
                username: '', email: '', password: '', full_name: '', nik: '', pob: '', dob: '', 
                gender: '', address: '', contact_number: '', location_id: '' 
            });
        }
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedAdmin(null);
        setFormData({ 
            username: '', email: '', password: '', full_name: '', nik: '', pob: '', dob: '', 
            gender: '', address: '', contact_number: '', location_id: '' 
        });
        setErrors({});
    };

    const handleFieldChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        let error = '';
        if (field === 'username') error = validators.username(value);
        else if (field === 'email') error = validators.email(value);
        else if (field === 'password' && value) error = validators.password(value);
        else if (field === 'full_name') error = validators.name(value);
        else if (field === 'nik') error = validators.nik(value);
        else if (field === 'pob') error = validators.required(value);
        else if (field === 'dob') error = validators.dob(value);
        else if (field === 'contact_number' && value) error = validators.phone(value);
        else if (field === 'gender' && !value) error = 'Required';
        
        setErrors(prev => ({ ...prev, [field]: error }));
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        
        if (modalMode === 'create') {
            newErrors.username = validators.username(formData.username);
            newErrors.email = validators.email(formData.email);
            if (formData.password) newErrors.password = validators.password(formData.password);
            newErrors.full_name = validators.name(formData.full_name);
            newErrors.nik = validators.nik(formData.nik);
            newErrors.pob = validators.required(formData.pob);
            newErrors.dob = validators.dob(formData.dob);
            if (formData.contact_number) newErrors.contact_number = validators.phone(formData.contact_number);
            if (!formData.gender) newErrors.gender = 'Required';
        }
        
        if (!formData.location_id || formData.location_id === '' || formData.location_id === 'no-locations') {
            newErrors.location_id = 'Please select a valid active location';
        }
        
        const filteredErrors = Object.fromEntries(
            Object.entries(newErrors).filter(([, v]) => v !== '')
        );
        setErrors(filteredErrors);
        return Object.keys(filteredErrors).length === 0;
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            setShowConfirmSubmit(true);
        }
    };

    const handleConfirmSubmit = async () => {
        setShowConfirmSubmit(false);
        setIsSubmitting(true);
        try {
            const payload = {
                username: formData.username,
                email: formData.email,
                password: formData.password || undefined,
                full_name: formData.full_name,
                nik: formData.nik,
                pob: formData.pob,
                dob: formData.dob,
                gender: formData.gender,
                address: formData.address,
                contact_number: formData.contact_number,
                location_id: formData.location_id,
                role: 'admin'
            };

            if (modalMode === 'create') {
                await api.createSuperAdminUser(payload);
                toast('Admin account created', 'success');
            } else if (modalMode === 'reassign' && selectedAdmin) {
                if (!formData.location_id) throw new Error("Location ID required");
                await api.reassignAdminLocation(selectedAdmin.id as string, formData.location_id);
                toast('Admin reassigned to new location', 'success');
            }
            closeModal();
            loadData();
        } catch (err: unknown) {
            const { message, fieldErrors } = parseApiError(err as Error);
            
            if (fieldErrors && Object.keys(fieldErrors).length > 0) {
                setErrors(fieldErrors);
                toast(message, 'error');
            } else {
                toast(message, 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleActivate = async () => {
        if (!adminToActivate) return;
        setIsSubmitting(true);
        try {
            await api.activateAdmin(adminToActivate.id as string);
            toast('Admin activated successfully', 'success');
            setShowActivate(false);
            setAdminToActivate(null);
            loadData();
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeactivate = async () => {
        if (!adminToDeactivate) return;
        setIsSubmitting(true);
        try {
            await api.deactivateAdmin(adminToDeactivate.id as string);
            toast('Admin deactivated successfully', 'success');
            setShowDeactivate(false);
            setAdminToDeactivate(null);
            loadData();
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!adminToDelete) return;
        setIsSubmitting(true);
        try {
            await api.deleteAdmin(adminToDelete.id as string);
            toast('Admin deleted successfully', 'success');
            setShowDelete(false);
            setAdminToDelete(null);
            loadData();
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden animate-in fade-in duration-500">
            <AdminFilters
                searchTerm={searchTerm}
                filterStatus={filterStatus}
                locations={locations}
                selectedLocationId={selectedLocationId}
                onSearchChange={setSearchTerm}
                onStatusChange={setFilterStatus}
                onLocationChange={setSelectedLocationId}
                onCreateAdmin={() => openModal('create')}
            />

            <div className="flex-1 p-4 lg:px-10 lg:py-6 bg-slate-50/30 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50/80 text-slate-400 sticky top-0 z-10 backdrop-blur-sm h-[48px]">
                                <tr>
                                    <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Admin Profile</th>
                                    <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Email</th>
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
                                ) : filteredAdmins.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="h-64 align-middle">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <ShieldCheck size={48} className="mb-4 opacity-20" />
                                                <p className="font-medium text-sm">No administrators found</p>
                                                <p className="text-xs mt-1 opacity-60">Try adjusting your filters or register a new admin.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedAdmins.map((admin) => (
                                        <AdminTableRow
                                            key={admin.id}
                                            admin={admin}
                                            locations={locations}
                                            onReassign={() => openModal('reassign', admin)}
                                            onActivate={() => { setAdminToActivate(admin); setShowActivate(true); }}
                                            onDeactivate={() => { setAdminToDeactivate(admin); setShowDeactivate(true); }}
                                            onDelete={() => { setAdminToDelete(admin); setShowDelete(true); }}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {!loading && filteredAdmins.length > 0 && (
                        <div className="px-8 py-3 border-t border-slate-200 bg-slate-50 relative z-20 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Page <span className="text-slate-800">{page}</span> of <span className="text-slate-800">{totalPages}</span>
                                </span>
                                <div className="h-4 w-px bg-slate-300"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    <span className="text-violet-600">{filteredAdmins.length}</span> Admins
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

            {modalMode && (
                <AdminFormModal
                    mode={modalMode}
                    formData={formData}
                    errors={errors}
                    locations={locations}
                    isSubmitting={isSubmitting}
                    onClose={closeModal}
                    onSubmit={handleFormSubmit}
                    onFieldChange={handleFieldChange}
                />
            )}

            <ConfirmationModal
                isOpen={showConfirmSubmit}
                onClose={() => setShowConfirmSubmit(false)}
                onConfirm={handleConfirmSubmit}
                title={modalMode === 'create' ? 'Create Admin Account?' : 'Reassign Admin Location?'}
                message={
                    <div className="space-y-4">
                        {modalMode === 'create' ? (
                            <>
                                <p className="text-sm text-slate-500 font-medium">Verify admin information before finalizing.</p>
                                <ReviewSummaryTable data={[
                                    { field: 'Username', value: formData.username },
                                    { field: 'Email', value: formData.email },
                                    { field: 'Full Name', value: formData.full_name },
                                    { field: 'NIK', value: formData.nik },
                                    { field: 'Place of Birth', value: formData.pob },
                                    { field: 'Date of Birth', value: formData.dob },
                                    { field: 'Gender', value: formData.gender === 'L' ? 'Male' : 'Female' },
                                    { field: 'Contact Number', value: formData.contact_number || '-' },
                                    { field: 'Address', value: formData.address || '-' },
                                    { field: 'Location', value: locations.find(l => l.id === formData.location_id)?.name || '-' }
                                ]} />
                                {!formData.password && (
                                    <p className="text-xs text-amber-600 font-bold text-center">
                                        Default password &apos;admin1234&apos; will be used
                                    </p>
                                )}
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-slate-500 font-medium">Confirm location reassignment.</p>
                                <ReviewSummaryTable data={[
                                    { field: 'Admin', value: selectedAdmin?.admin_profile?.full_name || selectedAdmin?.username || '-' },
                                    { field: 'Username', value: selectedAdmin?.username || '-' },
                                    { field: 'Current Location', value: locations.find(l => l.id === (selectedAdmin?.admin_profile?.location_id || selectedAdmin?.location_id))?.name || 'Unassigned' },
                                    { field: 'New Location', value: locations.find(l => l.id === formData.location_id)?.name || '-' }
                                ]} />
                            </>
                        )}
                    </div>
                }
                confirmText={modalMode === 'create' ? 'Create Admin' : 'Reassign'}
                isLoading={isSubmitting}
            />

            <ConfirmationModal
                isOpen={showActivate}
                onClose={() => setShowActivate(false)}
                onConfirm={handleActivate}
                title="Activate Admin?"
                message="Are you sure you want to activate this admin? This will enable their login access."
                confirmText="Activate"
                isLoading={isSubmitting}
            />

            <ConfirmationModal
                isOpen={showDeactivate}
                onClose={() => setShowDeactivate(false)}
                onConfirm={handleDeactivate}
                title="Deactivate Admin?"
                message={
                    <div className="space-y-3">
                        <p className="text-slate-600">You are about to deactivate:</p>
                        <p className="font-bold text-lg text-amber-700">{adminToDeactivate?.admin_profile?.full_name || adminToDeactivate?.username}</p>
                        <p className="text-sm text-amber-600 font-medium bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                            ⚠️ This will remove their access to the system until reactivated.
                        </p>
                    </div>
                }
                confirmText="Deactivate"
                isDestructive={true}
                warningLevel="standard"
                isLoading={isSubmitting}
            />

            <ConfirmationModal
                isOpen={showDelete}
                onClose={() => setShowDelete(false)}
                onConfirm={handleDelete}
                title="Delete Admin?"
                message={
                    <div className="space-y-3">
                        <p className="text-slate-600">You are about to permanently delete:</p>
                        <p className="font-bold text-lg text-rose-700">{adminToDelete?.admin_profile?.full_name || adminToDelete?.username}</p>
                        <p className="text-sm text-rose-700 font-bold bg-rose-50 px-3 py-2 rounded-lg border border-rose-200">
                            ⚠️ This action cannot be undone and will remove the admin account and all associated data.
                        </p>
                    </div>
                }
                confirmText="Delete"
                isDestructive={true}
                warningLevel="standard"
                isLoading={isSubmitting}
            />
        </div>
    );
}
