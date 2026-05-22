'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';

import StaffHeader from './parts/StaffHeader';
import LocationAssignmentModal from './parts/LocationAssignmentModal';
import CreateStaffModal from './parts/CreateStaffModal';
import EditStaffModal from './parts/EditStaffModal';
import StaffResignationModal from './parts/StaffResignationModal';
import StaffTableRow from './parts/StaffTableRow';
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

type ModalMode = 'create' | 'edit' | null;

export default function StaffManager() {
    const { show: toast } = useToast();
    const { setAdminLoading } = useStore();
    const [staff, setStaff] = useState<User[]>([]);
    const [locations, setLocations] = useState<LocationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const fetchIdRef = useRef(0);
    const lastFetchedRef = useRef("");
    const containerRef = useRef<HTMLDivElement>(null);

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
        role: '',
        specialty: '',
        str_number: '',
        str_expiry_date: '',
        sip_number: '',
        sip_expiry_date: '',
        operator_role: '',
        location_id: '',
        activation_status: 'REJECT'
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
    const [showResignModal, setShowResignModal] = useState(false);
    const [staffToResign, setStaffToResign] = useState<User | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        setAdminLoading(loading);
    }, [loading, setAdminLoading]);

    const handleRefresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
        toast("Staff data updated", "success");
    }, [toast]);

    useEffect(() => {
        globalEventBus.on(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefresh);
        return () => globalEventBus.off(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefresh);
    }, [handleRefresh]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterRole, filterStatus]);

    useEffect(() => {
        const currentParams = JSON.stringify({
            searchTerm,
            filterRole,
            filterStatus,
            refreshKey
        });
        if (lastFetchedRef.current === currentParams) return;

        const currentFetchId = ++fetchIdRef.current;

        const loadData = async () => {
            setLoading(true);
            lastFetchedRef.current = currentParams;

            try {
                const [usersRes, locRes] = await Promise.all([
                    api.fetchUsers({ limit: 1000, t: Date.now() }),
                    api.fetchLocations({ limit: 1000, t: Date.now() })
                ]);

                if (currentFetchId === fetchIdRef.current) {
                    const allUsers = Array.isArray(usersRes) ? usersRes : usersRes?.data || [];
                    const staffMembers = allUsers.filter((u: User) => {
                        if (u.role !== 'operator' && u.role !== 'doctor') return false;
                        return u.location_assignments && u.location_assignments.length > 0;
                    });
                    setStaff(staffMembers);
                    setLocations(Array.isArray(locRes) ? locRes : locRes?.data || []);
                }
            } catch (err) {
                if (currentFetchId === fetchIdRef.current) {
                    const { message } = parseApiError(err as Error);
                    toast(message, 'error');
                    lastFetchedRef.current = "";
                }
            } finally {
                if (currentFetchId === fetchIdRef.current) {
                    setLoading(false);
                    setAdminLoading(false);
                }
            }
        };

        loadData();
    }, [searchTerm, filterRole, filterStatus, refreshKey, toast, setAdminLoading]);

    const filteredStaff = staff.filter(member => {
        const matchesSearch = !searchTerm ||
            member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.operator_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.doctor_profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.id?.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesRole = true;
        if (filterRole) {
            if (filterRole.includes(':')) {
                const [role, subRole] = filterRole.split(':');
                if (role === 'operator') {
                    matchesRole = member.role === 'operator' && member.operator_profile?.operator_role === subRole;
                } else if (role === 'doctor') {
                    matchesRole = member.role === 'doctor' && member.doctor_profile?.specialty === subRole;
                }
            } else {
                matchesRole = member.role === filterRole;
            }
        }

        const matchesStatus = !filterStatus ||
            (filterStatus === 'active' && member.is_active) ||
            (filterStatus === 'inactive' && !member.is_active);

        return matchesSearch && matchesRole && matchesStatus;
    });

    const totalPages = Math.ceil(filteredStaff.length / rowsPerPage) || 1;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedStaff = filteredStaff.slice(startIndex, endIndex);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [filteredStaff.length, rowsPerPage, currentPage, totalPages]);

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
                if (calculatedRows >= idealRows) {
                    setRowsPerPage(idealRows);
                } else {
                    setRowsPerPage(calculatedRows);
                }
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

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
                role: member.role || '',
                specialty: member.doctor_profile?.specialty || '',
                str_number: profile?.str_number || '',
                str_expiry_date: profile?.str_expiry_date || '',
                sip_number: member.doctor_profile?.sip_number || '',
                sip_expiry_date: member.doctor_profile?.sip_expiry_date || '',
                operator_role: member.operator_profile?.operator_role || '',
                location_id: profile?.location_id || '',
                activation_status: 'REJECT'
            });
        } else {
            setSelectedStaff(null);
            setFormData({
                username: '', email: '', password: '', full_name: '', nik: '', pob: '', dob: '',
                gender: '', address: '', contact_number: '', role: '', specialty: '',
                str_number: '', str_expiry_date: '', sip_number: '', sip_expiry_date: '', operator_role: '', location_id: '',
                activation_status: 'REJECT'
            });
        }
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedStaff(null);
        setFormData({
            username: '', email: '', password: '', full_name: '', nik: '', pob: '', dob: '',
            gender: '', address: '', contact_number: '', role: '', specialty: '',
            str_number: '', str_expiry_date: '', sip_number: '', sip_expiry_date: '', operator_role: '', location_id: '',
            activation_status: 'REJECT'
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
        else if (field === 'str_number' && !value) error = 'Required';
        else if (field === 'specialty' && formData.role === 'doctor' && !value) error = 'Required';
        else if (field === 'sip_number' && formData.role === 'doctor' && !value) error = 'Required';
        else if (field === 'operator_role' && formData.role === 'operator' && !value) error = 'Required';

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
        if (!formData.str_number) newErrors.str_number = 'Required';

        if (formData.role === 'doctor') {
            if (!formData.specialty) newErrors.specialty = 'Required';
            if (!formData.sip_number) newErrors.sip_number = 'Required';
        }

        if (formData.role === 'operator') {
            if (!formData.operator_role) newErrors.operator_role = 'Required';
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
                str_expiry_date: formData.str_expiry_date || undefined,
                activation_status: formData.activation_status
            };

            if (formData.role === 'doctor') {
                payload.specialty = formData.specialty;
                payload.sip_number = formData.sip_number;
                payload.sip_expiry_date = formData.sip_expiry_date || undefined;
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
            setRefreshKey(prev => prev + 1);
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
            setRefreshKey(prev => prev + 1);
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
            setRefreshKey(prev => prev + 1);
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
            setRefreshKey(prev => prev + 1);
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResign = async (resignationDate: string, reason?: string) => {
        if (!staffToResign) return;
        setIsSubmitting(true);
        try {
            const response = await api.resignStaff(staffToResign.id as string, resignationDate, reason);
            const data = response?.data;
            toast(
                `Staff resignation processed successfully. ${data?.affected_locations || 0} location(s) removed, ${data?.sessions_invalidated || 0} session(s) invalidated.`,
                'success'
            );
            setShowResignModal(false);
            setStaffToResign(null);
            setRefreshKey(prev => prev + 1);
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddExistingStaff = async (userId: string) => {
        if (!locations || locations.length === 0) {
            toast('No locations available', 'error');
            return;
        }

        const adminLocation = locations.find(loc => loc.is_active);
        if (!adminLocation) {
            toast('No active location found', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.assignStaffLocation(userId, {
                location_id: adminLocation.id,
                is_primary: false
            });
            toast('Staff member added to your location successfully', 'success');
            closeModal();
            setRefreshKey(prev => prev + 1);
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditStaffSave = async (staffId: string, data: Partial<User>) => {
        try {
            await api.updateUser(staffId, data as never);
            toast('Staff member updated successfully', 'success');
            setRefreshKey(prev => prev + 1);
            return { success: true };
        } catch (err: unknown) {
            const { message, fieldErrors } = parseApiError(err as Error);
            return {
                success: false,
                message,
                fieldErrors
            };
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden">
            <StaffHeader
                searchTerm={searchTerm}
                filterRole={filterRole}
                filterStatus={filterStatus}
                onSearchChange={setSearchTerm}
                onRoleChange={setFilterRole}
                onStatusChange={setFilterStatus}
                onCreateNew={() => openModal('create')}
            />

            <div className="flex-1 p-4 lg:px-10 lg:py-6 bg-slate-50/30 min-h-0 flex flex-col overflow-hidden">
                {loading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center py-20">
                        <RefreshCcw size={40} className="text-rose-200 animate-spin mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Staff...</p>
                    </div>
                ) : filteredStaff.length === 0 ? (
                    <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
                        <div className="h-full w-full flex flex-col items-center justify-center py-20">
                            <Users size={48} className="text-slate-300 mb-4" />
                            <p className="text-slate-500 font-medium text-sm">No staff members found</p>
                            <p className="text-slate-400 text-xs mt-1">Adjust filters or add a new staff member</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
                        <div ref={containerRef} className="flex-1 overflow-x-auto overflow-y-hidden relative z-10">
                            <table className="w-full text-left border-collapse table-auto h-full">
                                <thead className="bg-slate-50/80 text-slate-400 sticky top-0 z-20 backdrop-blur-sm h-[48px]">
                                    <tr>
                                        <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Staff Profile</th>
                                        <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Role</th>
                                        <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Locations</th>
                                        <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap">Status</th>
                                        <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap text-right sticky right-0 bg-slate-50/80 backdrop-blur-sm">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedStaff.map((member) => (
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
                                            onResign={() => { setStaffToResign(member); setShowResignModal(true); }}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-8 py-3 border-t border-slate-50 bg-white relative z-20 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Page <span className="text-slate-800">{currentPage}</span> of <span className="text-slate-800">{totalPages}</span>
                                </span>
                                <div className="h-4 w-px bg-slate-200"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span className="text-rose-600">{filteredStaff.length}</span> Total Staff
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-rose-600 hover:border-rose-200 cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-rose-600 hover:border-rose-200 cursor-pointer"
                                >
                                    <ChevronRight className="w-4 h-4" strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {modalMode === 'create' && (
                <CreateStaffModal
                    formData={formData}
                    errors={errors}
                    adminLocation={locations.find(loc => loc.is_active) || null}
                    isSubmitting={isSubmitting}
                    onClose={closeModal}
                    onSubmit={handleFormSubmit}
                    onFieldChange={handleFieldChange}
                    onAddExistingStaff={handleAddExistingStaff}
                />
            )}

            {modalMode === 'edit' && selectedStaff && (
                <EditStaffModal
                    staff={selectedStaff}
                    onClose={closeModal}
                    onSave={handleEditStaffSave}
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
                                { field: 'Email', value: formData.email },
                                { field: 'Password', value: formData.password ? '••••••••' : 'user1234 (default)' }
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
                            { field: 'STR Number', value: formData.str_number || '-' }
                        ]} />
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
                        setRefreshKey(prev => prev + 1);
                    }}
                />
            )}

            <StaffResignationModal
                isOpen={showResignModal}
                staff={staffToResign}
                locations={locations}
                onClose={() => {
                    setShowResignModal(false);
                    setStaffToResign(null);
                }}
                onConfirm={handleResign}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}
