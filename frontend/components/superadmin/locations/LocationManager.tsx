'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { LocationResponse, LocationCreatePayload, LocationUpdatePayload } from '@/types/user';
import { useToast } from '@/hooks/useToast';
import { Plus, Edit2, AlertCircle, MapPin, Building, X, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { globalEventBus } from '@/services/events';
import { EVENTS } from '@/config/constants';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import StandardInput from '@/components/shared/StandardInput';
import SelectInput from '@/components/shared/SelectInput';
import { useStore } from '@/store/useStore';
import clsx from 'clsx';

type ModalMode = 'create' | 'edit' | null;

const defaultForm: LocationCreatePayload = {
    name: '',
    location_type: '',
    address: '',
    city: '',
    province: '',
    phone: '',
};

export default function LocationManager() {
    const { show: toast } = useToast();
    const setAdminLoading = useStore(state => state.setAdminLoading);
    const [locations, setLocations] = useState<LocationResponse[]>([]);
    const [loading, setLoading] = useState(true);

    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedLoc, setSelectedLoc] = useState<LocationResponse | null>(null);

    const [formData, setFormData] = useState<LocationCreatePayload>(defaultForm);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showDeactivate, setShowDeactivate] = useState(false);
    const [locToDeactivate, setLocToDeactivate] = useState<LocationResponse | null>(null);

    const [page, setPage] = useState(1);
    const rowsPerPage = 10;
    const totalPages = Math.ceil(locations.length / rowsPerPage) || 1;
    const paginatedLocations = locations.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    const loadLocations = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.fetchLocations({ limit: 1000, t: Date.now() });
            setLocations(Array.isArray(res) ? res : res?.data || []);
        } catch {
            toast('Failed to load locations', 'error');
        } finally {
            setLoading(false);
            setAdminLoading(false);
        }
    }, [toast, setAdminLoading]);

    useEffect(() => {
        loadLocations();
        
        const handleRefreshEvent = () => loadLocations();
        globalEventBus.on(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefreshEvent);
        return () => {
            globalEventBus.off(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefreshEvent);
        };
    }, [loadLocations]);

    const openModal = (mode: 'create' | 'edit', loc?: LocationResponse) => {
        setModalMode(mode);
        if (mode === 'edit' && loc) {
            setSelectedLoc(loc);
            setFormData({
                name: loc.name,
                location_type: loc.location_type,
                address: loc.address,
                city: loc.city || '',
                province: loc.province || '',
                phone: loc.phone || '',
            });
        } else {
            setSelectedLoc(null);
            setFormData(defaultForm);
        }
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedLoc(null);
        setFormData(defaultForm);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                city: formData.city?.trim() || null,
                province: formData.province?.trim() || null,
                phone: formData.phone?.trim() || null,
            };

            if (modalMode === 'create') {
                await api.createLocation(payload as any);
                toast('Location created successfully', 'success');
            } else if (modalMode === 'edit' && selectedLoc) {
                const updatePayload: LocationUpdatePayload = {
                    name: payload.name,
                    location_type: payload.location_type,
                    address: payload.address,
                    city: payload.city || undefined,
                    province: payload.province || undefined,
                    phone: payload.phone || undefined,
                };
                await api.updateLocation(selectedLoc.id, updatePayload);
                toast('Location updated successfully', 'success');
            }
            closeModal();
            loadLocations();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { detail?: string } } };
            toast(error?.response?.data?.detail || 'Failed to save location', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeactivate = async () => {
        if (!locToDeactivate) return;
        setIsSubmitting(true);
        try {
            await api.deactivateLocation(locToDeactivate.id);
            toast('Location deactivated', 'success');
            setShowDeactivate(false);
            setLocToDeactivate(null);
            loadLocations();
        } catch {
            toast('Failed to deactivate location', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 p-6 lg:p-8 gap-6 overflow-hidden animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <MapPin className="text-violet-600" /> Location Registry
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Manage all registered clinic locations across the platform.
                    </p>
                </div>
                <button
                    onClick={() => openModal('create')}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all"
                >
                    <Plus size={16} /> New Location
                </button>
            </div>

            <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50/80 text-slate-400 sticky top-0 z-10 backdrop-blur-sm h-[48px]">
                            <tr>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap text-left">Location Name</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap text-left">Type & Code</th>
                                <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 whitespace-nowrap text-left">Location</th>
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
                            ) : locations.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="h-64 align-middle">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <MapPin size={48} className="mb-4 opacity-20" />
                                            <p className="font-medium text-sm">No locations found</p>
                                            <p className="text-xs mt-1 opacity-60">Create your first location above.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedLocations.map((loc) => (
                                    <tr key={loc.id} className="hover:bg-violet-50/30 transition-colors group h-[48px]">
                                        <td className="px-5 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-900 text-white rounded flex items-center justify-center group-hover:bg-violet-600 transition-colors shadow-sm">
                                                    <Building size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-slate-800 group-hover:text-violet-700 transition-colors truncate max-w-[200px]">{loc.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 whitespace-nowrap">
                                            <div>
                                                <p className="text-[10px] font-mono font-black text-slate-500 uppercase">{loc.location_code}</p>
                                                <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border bg-slate-50 text-slate-500 border-slate-100">
                                                    {loc.location_type}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 whitespace-nowrap">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-600 truncate max-w-[150px]">{loc.city || 'No City'}, {loc.province || '-'}</p>
                                                <p className="text-[9px] font-mono font-bold text-slate-400 truncate max-w-[150px]">{loc.address}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 whitespace-nowrap">
                                            <div className={clsx(
                                                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border",
                                                loc.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                            )}>
                                                <span className={clsx("w-1.5 h-1.5 rounded-full", loc.is_active ? "bg-emerald-500" : "bg-slate-400")}></span>
                                                {loc.is_active ? "Active" : "Inactive"}
                                            </div>
                                        </td>
                                        <td className="px-5 whitespace-nowrap text-right pr-6">
                                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openModal('edit', loc)}
                                                    className="px-3 py-1.5 bg-white text-slate-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 hover:text-slate-800 transition-all active:scale-[0.98] border border-slate-200 cursor-pointer"
                                                >
                                                    Edit
                                                </button>
                                                {loc.is_active && (
                                                    <button
                                                        onClick={() => { setLocToDeactivate(loc); setShowDeactivate(true); }}
                                                        className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 hover:text-rose-700 transition-all active:scale-[0.98] border border-rose-100 cursor-pointer"
                                                    >
                                                        Deactivate
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && locations.length > 0 && (
                    <div className="px-8 py-3 border-t border-slate-200 bg-slate-50 relative z-20 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                Page <span className="text-slate-800">{page}</span> of <span className="text-slate-800">{totalPages}</span>
                            </span>
                            <div className="h-4 w-px bg-slate-300"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <span className="text-violet-600">{locations.length}</span> Total Locations
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
                    <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">
                                {modalMode === 'create' ? 'Register New Location' : 'Edit Location'}
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer p-1 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <StandardInput
                                label="Location Name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Puskesmas Menteng (Required)"
                            />
                            <SelectInput
                                label="Location Type"
                                required
                                value={formData.location_type}
                                onChange={(e) => setFormData({ ...formData, location_type: e.target.value as any })}
                                options={[
                                    { value: '', label: 'Select Type... (Required)' },
                                    { value: 'PUSKESMAS', label: 'Puskesmas' },
                                    { value: 'CLINIC', label: 'Clinic' },
                                    { value: 'HOSPITAL', label: 'Hospital' },
                                    { value: 'LABORATORY', label: 'Laboratory' }
                                ]}
                            />
                            <StandardInput
                                label="Full Address"
                                required
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="e.g. Jl. Menteng Raya No. 1, Jakarta Pusat (Required)"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <StandardInput
                                    label="City"
                                    value={formData.city || ''}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="e.g. Jakarta Pusat (Optional)"
                                />
                                <StandardInput
                                    label="Province"
                                    value={formData.province || ''}
                                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                                    placeholder="e.g. DKI Jakarta (Optional)"
                                />
                            </div>
                            <StandardInput
                                label="Phone Number"
                                value={formData.phone || ''}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="e.g. 02131000001 (Optional)"
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
                                    disabled={isSubmitting || !formData.name || !formData.address}
                                    className="px-6 py-2 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Location'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={showDeactivate}
                onClose={() => setShowDeactivate(false)}
                onConfirm={handleDeactivate}
                title="Deactivate Location?"
                message="Are you sure you want to deactivate this location? Users currently assigned to this location may lose access unless reassigned."
                confirmText="Deactivate"
                isDestructive={true}
                isLoading={isSubmitting}
            />
        </div>
    );
}
