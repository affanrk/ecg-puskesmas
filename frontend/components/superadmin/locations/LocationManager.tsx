'use client';

import { useState, useEffect, useCallback } from 'react';

import { MapPin, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';

import LocationFilters from './parts/LocationFilters';
import LocationFormModal from './parts/LocationFormModal';
import LocationTableRow from './parts/LocationTableRow';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import ReviewSummaryTable from '@/components/shared/ReviewSummaryTable';
import { EVENTS } from '@/config/constants';
import { useIndonesiaRegions } from '@/hooks/useIndonesiaRegions';
import { useToast } from '@/hooks/useToast';
import { api } from '@/services';
import { globalEventBus } from '@/services/websocket/events';
import { useStore } from '@/store/useStore';
import { LocationResponse, LocationCreatePayload, LocationUpdatePayload } from '@/types/user';
import { parseApiError } from '@/utils/helpers';
import { validators } from '@/utils/validators';

type ModalMode = 'create' | 'edit' | null;

const defaultForm: LocationCreatePayload = {
    name: '',
    location_type: '',
    address: '',
    province: '',
    city: '',
    kecamatan: '',
    kelurahan: '',
    phone: '',
};

export default function LocationManager() {
    const { show: toast } = useToast();
    const setAdminLoading = useStore(state => state.setAdminLoading);
    const [locations, setLocations] = useState<LocationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        setAdminLoading(loading);
    }, [loading, setAdminLoading]);

    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedLoc, setSelectedLoc] = useState<LocationResponse | null>(null);

    const [formData, setFormData] = useState<LocationCreatePayload>(defaultForm);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showDeactivate, setShowDeactivate] = useState(false);
    const [showActivate, setShowActivate] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
    const [locToDeactivate, setLocToDeactivate] = useState<LocationResponse | null>(null);
    const [locToActivate, setLocToActivate] = useState<LocationResponse | null>(null);
    const [locToDelete, setLocToDelete] = useState<LocationResponse | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const [page, setPage] = useState(1);
    const rowsPerPage = 10;

    const {
        provinceOptions,
        cityOptions,
        districtOptions,
        villageOptions,
        handleProvinceChange,
        handleCityChange,
        handleDistrictChange,
        loading: regionLoading
    } = useIndonesiaRegions();

    const [errors, setErrors] = useState<Record<string, string>>({});

    const filteredLocations = locations.filter(loc => {
        const matchesSearch = !searchTerm ||
            loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.location_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loc.province?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = !filterType || loc.location_type === filterType;
        const matchesStatus = !filterStatus ||
            (filterStatus === 'active' && loc.is_active) ||
            (filterStatus === 'inactive' && !loc.is_active);

        return matchesSearch && matchesType && matchesStatus;
    });

    const totalPages = Math.ceil(filteredLocations.length / rowsPerPage) || 1;
    const paginatedLocations = filteredLocations.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    const loadLocations = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.fetchSuperAdminLocations({ limit: 1000, t: Date.now() });
            setLocations(Array.isArray(res) ? res : res?.data || []);
        } catch {
            toast('Failed to load locations', 'error');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const handleRefresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
        toast('Locations refreshed successfully', 'success');
    }, [toast]);

    useEffect(() => {
        globalEventBus.on(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefresh);
        return () => globalEventBus.off(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefresh);
    }, [handleRefresh]);

    useEffect(() => {
        loadLocations();
    }, [loadLocations, refreshKey]);

    const openModal = (mode: 'create' | 'edit', loc?: LocationResponse) => {
        setModalMode(mode);
        setErrors({});
        if (mode === 'edit' && loc) {
            setSelectedLoc(loc);
            setFormData({
                name: loc.name,
                location_type: loc.location_type,
                address: loc.address,
                province: loc.province || '',
                city: loc.city || '',
                kecamatan: loc.kecamatan || '',
                kelurahan: loc.kelurahan || '',
                phone: loc.phone || '',
            });
            if (loc.province) handleProvinceChange(loc.province);
            if (loc.city) handleCityChange(loc.city);
            if (loc.kecamatan) handleDistrictChange(loc.kecamatan);
        } else {
            setSelectedLoc(null);
            setFormData(defaultForm);
        }
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedLoc(null);
        setFormData(defaultForm);
        setErrors({});
    };

    const handleFieldChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        let error = '';
        if (field === 'name') error = validators.required(value);
        else if (field === 'address') error = validators.required(value);
        else if (field === 'province') error = validators.required(value);
        else if (field === 'city') error = validators.required(value);
        else if (field === 'location_type' && !value) error = 'Required';
        else if (field === 'phone' && value) error = validators.phone(value);

        setErrors(prev => ({ ...prev, [field]: error }));
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.name?.trim()) newErrors.name = 'Required';
        if (!formData.location_type) newErrors.location_type = 'Required';
        if (!formData.address?.trim()) newErrors.address = 'Required';
        if (!formData.province?.trim()) newErrors.province = 'Required';
        if (!formData.city?.trim()) newErrors.city = 'Required';
        if (formData.phone) {
            const phoneError = validators.phone(formData.phone);
            if (phoneError) newErrors.phone = phoneError;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
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
                ...formData,
                province: formData.province?.trim() || null,
                city: formData.city?.trim() || null,
                kecamatan: formData.kecamatan?.trim() || null,
                kelurahan: formData.kelurahan?.trim() || null,
                phone: formData.phone?.trim() || null,
            };

            if (modalMode === 'create') {
                await api.createLocation(payload);
                toast('Location created successfully', 'success');
            } else if (modalMode === 'edit' && selectedLoc) {
                const updatePayload: LocationUpdatePayload = {
                    name: payload.name,
                    location_type: payload.location_type,
                    address: payload.address,
                    province: payload.province || undefined,
                    city: payload.city || undefined,
                    kecamatan: payload.kecamatan || undefined,
                    kelurahan: payload.kelurahan || undefined,
                    phone: payload.phone || undefined,
                };
                await api.updateLocation(selectedLoc.id, updatePayload);
                toast('Location updated successfully', 'success');
            }
            closeModal();
            loadLocations();
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

    const handleDeactivate = async () => {
        if (!locToDeactivate) return;
        setIsSubmitting(true);
        try {
            const response = await api.deactivateLocation(locToDeactivate.id);
            const message = response?.message || 'Location deactivated';

            if (message.toLowerCase().includes('warning:')) {
                toast(message, 'warning');
            } else {
                toast(message, 'success');
            }

            setShowDeactivate(false);
            setLocToDeactivate(null);
            loadLocations();
        } catch {
            toast('Failed to deactivate location', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleActivate = async () => {
        if (!locToActivate) return;
        setIsSubmitting(true);
        try {
            await api.activateLocation(locToActivate.id);
            toast('Location activated successfully', 'success');
            setShowActivate(false);
            setLocToActivate(null);
            loadLocations();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { detail?: string } } };
            toast(error?.response?.data?.detail || 'Failed to activate location', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!locToDelete) return;
        setIsSubmitting(true);
        try {
            await api.deleteLocation(locToDelete.id);
            toast('Location deleted successfully', 'success');
            setShowDelete(false);
            setLocToDelete(null);
            loadLocations();
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleProvinceSelect = (value: string) => {
        setFormData({ ...formData, province: value, city: '', kecamatan: '', kelurahan: '' });
        handleProvinceChange(value);
    };

    const handleCitySelect = (value: string) => {
        setFormData({ ...formData, city: value, kecamatan: '', kelurahan: '' });
        handleCityChange(value);
    };

    const handleDistrictSelect = (value: string) => {
        setFormData({ ...formData, kecamatan: value, kelurahan: '' });
        handleDistrictChange(value);
    };

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden animate-in fade-in duration-500">
            <LocationFilters
                searchTerm={searchTerm}
                filterType={filterType}
                filterStatus={filterStatus}
                onSearchChange={setSearchTerm}
                onTypeChange={setFilterType}
                onStatusChange={setFilterStatus}
                onCreateLocation={() => openModal('create')}
            />

            <div className="flex-1 p-4 lg:px-10 lg:py-6 bg-slate-50/30 min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                    <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50/80 text-slate-400 sticky top-0 z-10 backdrop-blur-sm h-[48px]">
                            <tr>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap text-left">Location Name</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap text-left">Type & Code</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap text-left">Region</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap text-left">Status</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap text-right pr-6">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="h-64 align-middle">
                                        <div className="flex flex-col items-center justify-center">
                                            <RefreshCcw size={40} className="text-slate-300 animate-spin mb-4" />
                                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Syncing Data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredLocations.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="h-64 align-middle">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <MapPin size={48} className="mb-4 opacity-20" />
                                            <p className="font-medium text-sm">No locations found</p>
                                            <p className="text-xs mt-1 opacity-60">Try adjusting your filters or create a new location.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedLocations.map((loc) => (
                                    <LocationTableRow
                                        key={loc.id}
                                        location={loc}
                                        onEdit={() => openModal('edit', loc)}
                                        onDeactivate={() => { setLocToDeactivate(loc); setShowDeactivate(true); }}
                                        onActivate={() => { setLocToActivate(loc); setShowActivate(true); }}
                                        onDelete={() => { setLocToDelete(loc); setShowDelete(true); }}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && filteredLocations.length > 0 && (
                    <div className="px-8 py-3 border-t border-slate-200 bg-slate-50 relative z-20 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                Page <span className="text-slate-800">{page}</span> of <span className="text-slate-800">{totalPages}</span>
                            </span>
                            <div className="h-4 w-px bg-slate-300"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <span className="text-violet-600">{filteredLocations.length}</span> Locations
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
                <LocationFormModal
                    mode={modalMode}
                    formData={formData}
                    errors={errors}
                    isSubmitting={isSubmitting}
                    provinceOptions={provinceOptions}
                    cityOptions={cityOptions}
                    districtOptions={districtOptions}
                    villageOptions={villageOptions}
                    regionLoading={regionLoading}
                    onClose={closeModal}
                    onSubmit={handleFormSubmit}
                    onFieldChange={handleFieldChange}
                    onProvinceChange={handleProvinceSelect}
                    onCityChange={handleCitySelect}
                    onDistrictChange={handleDistrictSelect}
                />
            )}

            <ConfirmationModal
                isOpen={showConfirmSubmit}
                onClose={() => setShowConfirmSubmit(false)}
                onConfirm={handleConfirmSubmit}
                title={modalMode === 'create' ? 'Create Location?' : 'Update Location?'}
                message={
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500 font-medium">
                            Verify location information before {modalMode === 'create' ? 'creating' : 'updating'}.
                        </p>
                        <ReviewSummaryTable data={[
                            { field: 'Location Name', value: formData.name },
                            { field: 'Type', value: formData.location_type },
                            { field: 'Address', value: formData.address },
                            { field: 'Province', value: formData.province || '-' },
                            { field: 'City', value: formData.city || '-' },
                            { field: 'Kecamatan', value: formData.kecamatan || '-' },
                            { field: 'Kelurahan', value: formData.kelurahan || '-' },
                            { field: 'Phone', value: formData.phone || '-' }
                        ]} />
                    </div>
                }
                confirmText={modalMode === 'create' ? 'Create Location' : 'Update Location'}
                isLoading={isSubmitting}
            />

            <ConfirmationModal
                isOpen={showDeactivate}
                onClose={() => setShowDeactivate(false)}
                onConfirm={handleDeactivate}
                title="Deactivate Location?"
                message={
                    <div className="space-y-3">
                        <p className="text-slate-600">You are about to deactivate:</p>
                        <p className="font-bold text-lg text-amber-700">{locToDeactivate?.name}</p>
                        <p className="text-sm text-amber-600 font-medium bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                            ⚠️ Users currently assigned to this location may lose access unless reassigned.
                        </p>
                    </div>
                }
                confirmText="Deactivate"
                isDestructive={true}
                warningLevel="standard"
                isLoading={isSubmitting}
            />

            <ConfirmationModal
                isOpen={showActivate}
                onClose={() => setShowActivate(false)}
                onConfirm={handleActivate}
                title="Activate Location?"
                message={
                    <div className="space-y-3">
                        <p className="text-slate-600">You are about to activate:</p>
                        <p className="font-bold text-lg text-emerald-700">{locToActivate?.name}</p>
                        <p className="text-sm text-slate-500">This will make it available for user assignments.</p>
                    </div>
                }
                confirmText="Activate"
                isLoading={isSubmitting}
            />

            <ConfirmationModal
                isOpen={showDelete}
                onClose={() => setShowDelete(false)}
                onConfirm={handleDelete}
                title="Delete Location?"
                message={
                    <div className="space-y-3">
                        <p className="text-slate-600">You are about to permanently delete:</p>
                        <p className="font-bold text-lg text-rose-700">{locToDelete?.name}</p>
                        <p className="text-sm text-rose-700 font-bold bg-rose-50 px-3 py-2 rounded-lg border border-rose-200">
                            ⚠️ This action cannot be undone and will remove all location data.
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
