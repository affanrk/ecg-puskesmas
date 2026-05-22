'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import { X, AlertTriangle, MapPin, LogOut, RefreshCcw } from 'lucide-react';

import FlatpickrInput from '@/components/shared/FlatpickrInput';
import { useToast } from '@/hooks/useToast';
import { api } from '@/services';
import { User, LocationResponse, StaffLocationResponse } from '@/types/user';
import { parseApiError } from '@/utils/helpers';

interface StaffResignationModalProps {
    isOpen: boolean;
    staff: User | null;
    locations: LocationResponse[];
    onClose: () => void;
    onConfirm: (resignationDate: string, reason?: string) => void;
    isSubmitting: boolean;
}

export default function StaffResignationModal({
    isOpen,
    staff,
    locations,
    onClose,
    onConfirm,
    isSubmitting
}: StaffResignationModalProps) {
    const { show: toast } = useToast();
    const [resignationDate, setResignationDate] = useState('');
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<{ resignationDate?: string }>({});
    const [staffLocations, setStaffLocations] = useState<StaffLocationResponse[]>([]);
    const [loadingLocations, setLoadingLocations] = useState(false);
    const initialized = useRef(false);

    const profile = staff?.role === 'doctor' ? staff.doctor_profile : staff?.operator_profile;
    const staffName = profile?.full_name || staff?.username || '';
    const staffRole = staff?.role === 'doctor' ? 'Doctor' : 'Operator';

    const loadStaffLocations = useCallback(async () => {
        if (!staff?.id) return;
        setLoadingLocations(true);
        try {
            const response = await api.fetchStaffLocations(staff.id);
            const data = Array.isArray(response) ? response : response?.data || [];
            setStaffLocations(data);
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setLoadingLocations(false);
        }
    }, [staff?.id, toast]);

    useEffect(() => {
        if (!isOpen || !staff) {
            initialized.current = false;
            return;
        }
        if (initialized.current) return;
        initialized.current = true;
        loadStaffLocations();
    }, [isOpen, staff, loadStaffLocations]);

    if (!isOpen || !staff) return null;

    const primaryLocation = staffLocations.find(ul => ul.is_primary);
    const additionalLocations = staffLocations.filter(ul => !ul.is_primary);

    const getLocationName = (locationId: string) => {
        const location = locations.find(l => l.id === locationId);
        return location?.name || locationId;
    };

    const validateForm = () => {
        const newErrors: { resignationDate?: string } = {};

        if (!resignationDate) {
            newErrors.resignationDate = 'Resignation date is required';
        } else {
            const selectedDate = new Date(resignationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (selectedDate < today) {
                newErrors.resignationDate = 'Resignation date cannot be in the past';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onConfirm(resignationDate, reason || undefined);
        }
    };

    const handleClose = () => {
        setResignationDate('');
        setReason('');
        setErrors({});
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={handleClose} />
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Process Staff Resignation</h2>
                    </div>
                    <button 
                        onClick={handleClose} 
                        disabled={isSubmitting}
                        className="p-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 border border-rose-100 hover:border-rose-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                            Staff Information
                        </h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500 font-medium">Name:</span>
                                <span className="text-sm text-slate-800 font-bold">{staffName}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500 font-medium">Role:</span>
                                <span className="text-sm text-slate-800 font-bold">{staffRole}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-500 font-medium">User ID:</span>
                                <span className="text-xs text-slate-600 font-mono">{staff.id}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-2 flex-1">
                                <h4 className="text-sm font-black text-amber-800">
                                    Affected Locations
                                </h4>
                                <p className="text-xs text-amber-700 leading-relaxed">
                                    This staff member will be removed from all assigned locations:
                                </p>
                                {loadingLocations ? (
                                    <div className="flex items-center justify-center py-4">
                                        <RefreshCcw size={20} className="text-amber-500 animate-spin" />
                                    </div>
                                ) : staffLocations.length === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-xs text-amber-700 font-medium">No locations assigned</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-1.5 mt-3">
                                            {primaryLocation && (
                                                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-amber-200">
                                                    <MapPin size={14} className="text-amber-600 shrink-0" />
                                                    <span className="text-xs font-bold text-amber-800">
                                                        {getLocationName(primaryLocation.location_id)}
                                                    </span>
                                                    <span className="ml-auto text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
                                                        Primary
                                                    </span>
                                                </div>
                                            )}
                                            {additionalLocations.map((ul) => (
                                                <div key={ul.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-amber-200">
                                                    <MapPin size={14} className="text-slate-400 shrink-0" />
                                                    <span className="text-xs font-medium text-slate-700">
                                                        {getLocationName(ul.location_id)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-amber-700 font-bold mt-3">
                                            Total locations affected: {staffLocations.length}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                            <div className="space-y-2 flex-1">
                                <h4 className="text-sm font-black text-rose-800">
                                    Session Invalidation
                                </h4>
                                <p className="text-xs text-rose-700 leading-relaxed">
                                    All active sessions for this staff member will be immediately invalidated. 
                                    They will be logged out from all devices and will not be able to log in again.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Resignation Details
                        </h4>
                        
                        <FlatpickrInput
                            label="Resignation Date"
                            required
                            value={resignationDate}
                            onChange={(date) => {
                                setResignationDate(date);
                                if (errors.resignationDate) {
                                    setErrors({ ...errors, resignationDate: undefined });
                                }
                            }}
                            placeholder="Select resignation date"
                            errorMessage={errors.resignationDate}
                        />

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700">
                                Reason (Optional)
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="e.g., Personal reasons, Career change, Relocation"
                                rows={3}
                                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                            />
                        </div>
                    </div>

                    <div className="pt-4 pb-6 -bottom-6 sticky bg-white z-10 border-t border-slate-50 mt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <LogOut size={16} />
                                    Process Resignation
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
