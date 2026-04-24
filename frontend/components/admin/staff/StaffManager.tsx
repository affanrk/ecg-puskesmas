'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/services/api';
import { User, LocationResponse } from '@/types/user';
import { useToast } from '@/hooks/useToast';
import { Plus, Users, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { globalEventBus } from '@/services/events';
import { EVENTS } from '@/config/constants';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import ReviewSummaryTable from '@/components/shared/ReviewSummaryTable';
import { useStore } from '@/store/useStore';
import { validators } from '@/utils/validators';
import { parseApiError } from '@/utils/helpers';
import StaffFilters from './parts/StaffFilters';
import StaffFormModal from './parts/StaffFormModal'
import StaffTableRow from './parts/StaffTableRow';
import LocationAssignmentModal from './parts/LocationAssignmentModal';

type ModalMode = 'create' | 'edit' | null;

export default function StaffManager() {
    const { show: toast } = useToast();
    const setAdminLoading = useStore(state => state.setAdminLoading);
    const [staff, setStaff] = useState<User[]>([]);
    const [locations, setLocations] = useState<LocationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const initialized = useRef(false);

    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedStaff, setSelectedStaff] = useState<User | null>(null);

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
        role: 'operator',
        specialty: '',
        str_number: '',
        sip_number: '',
        operator_role: '',
        work_location: '',
        location_id: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
    const [showActivate, setShowActivate] = useState(false);
    const [showDeactivate, setShowDeactivate] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [staffToActivate, setStaffToActivate] = useState<User | null>(null);
    const [staffToDeactivate, setStaffToDeactivate] = useState<User | null>(null);
    const [staffToDelete, setStaffToDelete] = useState<User | null>(null);
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [staffForLocationAssignment, setStaffForLocationAssignment] = useState<User | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const rowsPerPage = 10;

    const [errors, setErrors] = useState<Record<string, string>>({});

    const filteredStaff = staff.filter(member => {
        const matchesSearch = !searchTerm ||
            member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.operator_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.doctor_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.id?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = !filterRole || member.role === filterRole;

        const matchesStatus = !filterStatus ||
            (filterStatus === 'active' && member.is_active) ||
            (filterStatus === 'inactive' && !member.is_active);

        const matchesLocation = !selectedLocationId ||
            (member.operator_profile?.location_id === selectedLocationId) ||
            (member.doctor_profile?.location_id === selectedLocationId);

        return matchesSearch && matchesRole && matchesStatus && matchesLocation;
    });

    const totalPages = Math.ceil(filteredStaff.length / rowsPerPage) || 1;
    const paginatedStaff = filteredStaff.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [usersRes, locRes] = await Promise.all([
                api.fetchUsers({ limit: 1000, t: Date.now() }),
                api.fetchLocations({ limit: 1000, t: Date.now() })
            ]);
            const allUsers = Array.isArray(usersRes) ? usersRes : usersRes?.data || [];
            const staffMembers = allUsers.filter((u: User) => u.role === 'operator' || u.role === 'doctor');
            setStaff(staffMembers);
            setLocations(Array.isArray(locRes) ? locRes : locRes?.data || []);
        } catch {
            toast('Failed to load staff', 'error');
        } finally {
            setLoading(false);
            setAdminLoading(false);
        }
    }, [toast, setAdminLoading]);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        loadData();

        const handleRefreshEvent = () => loadData();
        globalEventBus.on(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefreshEvent);
        return () => {
            globalEventBus.off(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefreshEvent);
        };
    }, [loadData]);

    const openModal = (mode: 'create' | 'edit', member?: User) => {
        setModalMode(mode);
        setErrors({});
        if (mode === 'edit' && member) {
            setSelectedStaff(member);
            const profile = member.role === 'doctor' ? member.doctor_profile : member.operator_profile;
            setFormData({
                username: member.username || '',
                email: member.email || '',
                password: '',
                full_name: profile?.full_name || '',
                nik: profile?.nik || '',
                pob: profile?.pob || '',
                dob: profile?.dob || '',
                gender: profile?.gender || '',
                address: profile?.address || '',
                contact_number: profile?.contact_number || '',
                role: member.role || 'operator',
                specialty: member.doctor_profile?.specialty || '',
                str_number: profile?.str_number || '',
                sip_number: member.doctor_profile?.sip_number || '',
                operator_role: member.operator_profile?.operator_role || '',
                work_location: profile?.work_location || '',
                location_id: profile?.location_id || ''
            });
        } else {
            setSelectedStaff(null);
            setFormData({
                username: '', email: '', password: '', full_name: '', nik: '', pob: '', dob: '',
                gender: '', address: '', contact_number: '', role: 'operator', specialty: '',
                str_number: '', sip_number: '', operator_role: '', work_location: '', location_id: ''
            });
        }
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedStaff(null);
        setFormData({
            username: '', email: '', password: '', full_name: '', nik: '', pob: '', dob: '',
            gender: '', address: '', contact_number: '', role: 'operator', specialty: '',
            str_number: '', sip_number: '', operator_role: '', work_location: '', location_id: ''
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
        else if (field === 'role' && !value) error = 'Required';

        setErrors(prev => ({ ...prev, [field]: error }));
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (modalMode === 'create') {
            newErrors.username = validators.username(formData.username);
            newErrors.email = validators.email(formData.email);
        }
        if (formData.password) newErrors.password = validators.password(formData.password);
        newErrors.full_name = validators.name(formData.full_name);
        newErrors.nik = validators.nik(formData.nik);
        newErrors.pob = validators.required(formData.pob);
        newErrors.dob = validators.dob(formData.dob);
        if (formData.contact_number) newErrors.contact_number = validators.phone(formData.contact_number);
        if (!formData.gender) newErrors.gender = 'Required';
        if (!formData.role) newErrors.role = 'Required';
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
            const payload: Record<string, unknown> = {
                username: formData.username,
                email: formData.email,
                password: formData.password || undefined,
                role: formData.role,
                full_name: formData.full_name,
                nik: formData.nik,
                pob: formData.pob,
                dob: formData.dob,
                gender: formData.gender,
                address: formData.address,
                contact_number: formData.contact_number,
                str_number: formData.str_number,
                work_location: formData.work_location
            };

            if (formData.role === 'doctor') {
                payload.specialty = formData.specialty;
                payload.sip_number = formData.sip_number;
            } else {
                payload.operator_role = formData.operator_role;
            }

            if (modalMode === 'create') {
                await api.createUser(payload as never);
                toast('Staff member created successfully', 'success');
            } else if (modalMode === 'edit' && selectedStaff) {
                await api.updateUser(selectedStaff.id as string, payload as never);
                toast('Staff member updated successfully', 'success');
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
        if (!staffToActivate) return;
        setIsSubmitting(true);
        try {
            await api.updateUser(staffToActivate.id as string, { account_status: 'active' } as never);
            toast('Staff member activated successfully', 'success');
            setShowActivate(false);
            setStaffToActivate(null);
            loadData();
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeactivate = async () => {
        if (!staffToDeactivate) return;
        setIsSubmitting(true);
        try {
            await api.updateUser(staffToDeactivate.id as string, { account_status: 'inactive' } as never);
            toast('Staff member deactivated successfully', 'success');
            setShowDeactivate(false);
            setStaffToDeactivate(null);
            loadData();
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!staffToDelete) return;
        setIsSubmitting(true);
        try {
            await api.deleteUser(staffToDelete.id as string);
            toast('Staff member deleted successfully', 'success');
            setShowDelete(false);
            setStaffToDelete(null);
            loadData();
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 p-6 lg:p-8 gap-6 overflow-hidden animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <StaffFilters
                    searchTerm={searchTerm}
                    filterRole={filterRole}
                    filterStatus={filterStatus}
                    locations={locations}
                    selectedLocationId={selectedLocationId}
                    onSearchChange={setSearchTerm}
                    onRoleChange={setFilterRole}
                    onStatusChange={setFilterStatus}
                    onLocationChange={setSelectedLocationId}
                />
                <button
                    onClick={() => openModal('create')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all"
                >
                    <Plus size={16} /> New Staff
                </button>
            </div>

            <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50/80 text-slate-400 sticky top-0 z-10 backdrop-blur-sm h-[48px]">
                            <tr>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Staff Profile</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Role</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Locations</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Status</th>
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
                            ) : filteredStaff.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="h-64 align-middle">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <Users size={48} className="mb-4 opacity-20" />
                                            <p className="font-medium text-sm">No staff members found</p>
                                            <p className="text-xs mt-1 opacity-60">Try adjusting your filters or add a new staff member.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedStaff.map((member) => (
                                    <StaffTableRow
                                        key={member.id}
                                        staff={member}
                                        locations={locations}
                                        onEdit={() => openModal('edit', member)}
                                        onAssignLocations={() => {
                                            setStaffForLocationAssignment(member);
                                            setShowLocationModal(true);
                                        }}
                                        onActivate={() => { setStaffToActivate(member); setShowActivate(true); }}
                                        onDeactivate={() => { setStaffToDeactivate(member); setShowDeactivate(true); }}
                                        onDelete={() => { setStaffToDelete(member); setShowDelete(true); }}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && filteredStaff.length > 0 && (
                    <div className="px-8 py-3 border-t border-slate-200 bg-slate-50 relative z-20 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                Page <span className="text-slate-800">{page}</span> of <span className="text-slate-800">{totalPages}</span>
                            </span>
                            <div className="h-4 w-px bg-slate-300"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <span className="text-blue-600">{filteredStaff.length}</span> Staff
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-blue-600 hover:border-blue-200 cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                            </button>
                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-blue-600 hover:border-blue-200 cursor-pointer"
                            >
                                <ChevronRight className="w-4 h-4" strokeWidth={3} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {modalMode && (
                <StaffFormModal
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
                title={modalMode === 'create' ? 'Create Staff Member?' : 'Update Staff Member?'}
                message={
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500 font-medium">Verify staff information before finalizing.</p>
                        <ReviewSummaryTable data={[
                            ...(modalMode === 'create' ? [
                                { field: 'Username', value: formData.username },
                                { field: 'Email', value: formData.email }
                            ] : []),
                            { field: 'Full Name', value: formData.full_name },
                            { field: 'Role', value: formData.role === 'doctor' ? 'Doctor' : 'Operator' },
                            { field: 'NIK', value: formData.nik },
                            { field: 'Place of Birth', value: formData.pob },
                            { field: 'Date of Birth', value: formData.dob },
                            { field: 'Gender', value: formData.gender === 'L' ? 'Male' : 'Female' },
                            { field: 'Contact Number', value: formData.contact_number || '-' },
                            ...(formData.role === 'doctor' ? [
                                { field: 'Specialty', value: formData.specialty || '-' },
                                { field: 'SIP Number', value: formData.sip_number || '-' }
                            ] : [
                                { field: 'Operator Role', value: formData.operator_role || '-' }
                            ]),
                            { field: 'STR Number', value: formData.str_number || '-' },
                            { field: 'Work Location', value: formData.work_location || '-' }
                        ]} />
                        {modalMode === 'create' && !formData.password && (
                            <p className="text-xs text-amber-600 font-bold text-center">
                                Default password will be generated
                            </p>
                        )}
                    </div>
                }
                confirmText={modalMode === 'create' ? 'Create Staff' : 'Update Staff'}
                isLoading={isSubmitting}
            />

            <ConfirmationModal
                isOpen={showActivate}
                onClose={() => setShowActivate(false)}
                onConfirm={handleActivate}
                title="Activate Staff Member?"
                message="Are you sure you want to activate this staff member? This will enable their login access."
                confirmText="Activate"
                isLoading={isSubmitting}
            />

            <ConfirmationModal
                isOpen={showDeactivate}
                onClose={() => setShowDeactivate(false)}
                onConfirm={handleDeactivate}
                title="Deactivate Staff Member?"
                message={
                    <div className="space-y-3">
                        <p className="text-slate-600">You are about to deactivate:</p>
                        <p className="font-bold text-lg text-amber-700">
                            {staffToDeactivate?.operator_profile?.full_name || staffToDeactivate?.doctor_profile?.full_name || staffToDeactivate?.username}
                        </p>
                        <p className="text-sm text-amber-600 font-medium bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                            ⚠️ This will remove their access to the system until reactivated.
                        </p>
                    </div>
                }
                confirmText="Deactivate"
                isDestructive={false}
                warningLevel="standard"
                isLoading={isSubmitting}
            />

            <ConfirmationModal
                isOpen={showDelete}
                onClose={() => setShowDelete(false)}
                onConfirm={handleDelete}
                title="Delete Staff Member?"
                message={
                    <div className="space-y-3">
                        <p className="text-slate-600">You are about to permanently delete:</p>
                        <p className="font-bold text-lg text-rose-700">
                            {staffToDelete?.operator_profile?.full_name || staffToDelete?.doctor_profile?.full_name || staffToDelete?.username}
                        </p>
                        <p className="text-sm text-rose-700 font-bold bg-rose-50 px-3 py-2 rounded-lg border border-rose-200">
                            ⚠️ This action cannot be undone and will remove the staff member and all associated data.
                        </p>
                    </div>
                }
                confirmText="Delete"
                isDestructive={true}
                warningLevel="high"
                isLoading={isSubmitting}
            />

            {showLocationModal && staffForLocationAssignment && (
                <LocationAssignmentModal
                    staff={staffForLocationAssignment}
                    locations={locations}
                    onClose={() => {
                        setShowLocationModal(false);
                        setStaffForLocationAssignment(null);
                    }}
                    onSuccess={() => {
                        loadData();
                    }}
                />
            )}
        </div>
    );
}
