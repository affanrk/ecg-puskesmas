'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

import clsx from 'clsx';
import { X, MapPin, Star, Plus, Trash2, RefreshCcw } from 'lucide-react';

import { useToast } from '@/hooks/useToast';
import { api } from '@/services';
import { User, LocationResponse, StaffLocationResponse } from '@/types/user';
import { parseApiError } from '@/utils/helpers';

interface LocationAssignmentModalProps {
    staff: User;
    locations: LocationResponse[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function LocationAssignmentModal({ 
    staff, 
    locations, 
    onClose, 
    onSuccess 
}: LocationAssignmentModalProps) {
    const { show: toast } = useToast();
    const [assignments, setAssignments] = useState<StaffLocationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedLocationId, setSelectedLocationId] = useState('');
    const initialized = useRef(false);

    const profile = staff.role === 'doctor' ? staff.doctor_profile : staff.operator_profile;
    const staffName = profile?.full_name || staff.username;

    const loadAssignments = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.fetchStaffLocations(staff.id as string);
            const data = Array.isArray(response) ? response : response?.data || [];
            setAssignments(data);
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setLoading(false);
        }
    }, [staff.id, toast]);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;
        loadAssignments();
    }, [loadAssignments]);

    const handleAddLocation = async () => {
        if (!selectedLocationId) {
            toast('Please select a location', 'error');
            return;
        }

        if (assignments.some(a => a.location_id === selectedLocationId)) {
            toast('Staff is already assigned to this location', 'error');
            return;
        }

        setProcessing(true);
        try {
            await api.assignStaffLocation(staff.id as string, {
                location_id: selectedLocationId,
                is_primary: assignments.length === 0
            });
            toast('Location assigned successfully', 'success');
            setSelectedLocationId('');
            await loadAssignments();
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleRemoveLocation = async (locationId: string) => {
        if (assignments.length === 1) {
            toast('Cannot remove the last location', 'error');
            return;
        }

        const assignment = assignments.find(a => a.location_id === locationId);
        if (assignment?.is_primary) {
            toast('Cannot remove primary location. Set another location as primary first.', 'error');
            return;
        }

        setProcessing(true);
        try {
            await api.removeStaffLocation(staff.id as string, locationId);
            toast('Location removed successfully', 'success');
            await loadAssignments();
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleSetPrimary = async (locationId: string) => {
        setProcessing(true);
        try {
            await api.setStaffPrimaryLocation(staff.id as string, locationId);
            toast('Primary location updated successfully', 'success');
            await loadAssignments();
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const activeLocations = locations.filter(loc => loc.is_active);
    const availableLocations = activeLocations.filter(
        loc => !assignments.some(a => a.location_id === loc.id)
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Manage Location Assignments</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Staff: <span className="font-bold text-slate-700">{staffName}</span>
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 border border-rose-100 hover:border-rose-200 transition-all cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form className="p-6 space-y-6 overflow-y-auto flex-1" onSubmit={(e) => { e.preventDefault(); handleAddLocation(); }}>
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Add Location
                        </h4>
                        <div className="flex gap-2">
                            <select
                                value={selectedLocationId}
                                onChange={(e) => setSelectedLocationId(e.target.value)}
                                disabled={processing || availableLocations.length === 0}
                                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">
                                    {availableLocations.length === 0 
                                        ? 'No available locations' 
                                        : 'Select a location...'}
                                </option>
                                {availableLocations.map(loc => (
                                    <option key={loc.id} value={loc.id}>
                                        {loc.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="submit"
                                disabled={!selectedLocationId || processing}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                            >
                                {processing ? (
                                    <RefreshCcw size={16} className="animate-spin" />
                                ) : (
                                    <Plus size={16} />
                                )}
                                Add
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Current Assignments
                        </h4>
                        
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <RefreshCcw size={24} className="text-slate-300 animate-spin" />
                            </div>
                        ) : assignments.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <MapPin size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm font-medium">No locations assigned</p>
                                <p className="text-xs mt-1">Add a location to get started</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {assignments.map((assignment) => {
                                    const location = locations.find(l => l.id === assignment.location_id);
                                    if (!location) return null;

                                    return (
                                        <div
                                            key={assignment.id}
                                            className={clsx(
                                                "flex items-center justify-between p-3 rounded-lg border transition-all",
                                                assignment.is_primary
                                                    ? "bg-amber-50 border-amber-200"
                                                    : "bg-slate-50 border-slate-200 hover:border-slate-300"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={clsx(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center",
                                                    assignment.is_primary
                                                        ? "bg-amber-100 text-amber-600"
                                                        : "bg-slate-100 text-slate-600"
                                                )}>
                                                    <MapPin size={16} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-bold text-slate-800">
                                                            {location.name}
                                                        </p>
                                                        {assignment.is_primary && (
                                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                                                <Star size={10} className="fill-amber-500 text-amber-500" />
                                                                <span className="text-[8px] font-black uppercase tracking-wider">Primary</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-500">
                                                        {location.address}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!assignment.is_primary && (
                                                    <button
                                                        onClick={() => handleSetPrimary(assignment.location_id)}
                                                        disabled={processing}
                                                        className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-amber-100 hover:text-amber-700 transition-all active:scale-[0.98] border border-amber-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                    >
                                                        <Star size={10} /> Set Primary
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleRemoveLocation(assignment.location_id)}
                                                    disabled={processing || assignment.is_primary || assignments.length === 1}
                                                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-red-100 hover:text-red-700 transition-all active:scale-[0.98] border border-red-100 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                                                    title={
                                                        assignment.is_primary 
                                                            ? "Cannot remove primary location" 
                                                            : assignments.length === 1 
                                                                ? "Cannot remove last location" 
                                                                : "Remove location"
                                                    }
                                                >
                                                    <Trash2 size={10} /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-xs text-blue-700 font-medium">
                            <span className="font-black">Note:</span> Staff must have at least one location assigned. 
                            The primary location cannot be removed until another location is set as primary.
                        </p>
                    </div>

                    <div className="pt-4 pb-6 -bottom-6 sticky bg-white z-10 border-t border-slate-50 mt-4">
                        <button
                            type="button"
                            onClick={() => {
                                onSuccess();
                                onClose();
                            }}
                            className="w-full py-4 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Plus size={16} /> Save & Close
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
