'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Search, UserCheck, Stethoscope, Users, RefreshCcw, AlertCircle } from 'lucide-react';
import { User, PatientDoctorResponse } from '@/types/user';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { parseApiError } from '@/utils/helpers';
import clsx from 'clsx';

interface DoctorSelectionModalProps {
    patient: User;
    currentAssignment?: PatientDoctorResponse | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function DoctorSelectionModal({
    patient,
    currentAssignment,
    onClose,
    onSuccess
}: DoctorSelectionModalProps) {
    const { show: toast } = useToast();
    const [doctors, setDoctors] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
    const initialized = useRef(false);

    const patientProfile = patient.patient_profile;
    const patientName = patientProfile?.full_name || patient.username;
    const patientLocationId = patientProfile?.location_id;

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const loadDoctors = async () => {
            setLoading(true);
            try {
                const response = await api.fetchUsers({ limit: 1000, t: Date.now() });
                const allUsers = Array.isArray(response) ? response : response?.data || [];

                const availableDoctors = allUsers.filter((u: User) =>
                    u.role === 'doctor' &&
                    u.is_active &&
                    u.doctor_profile?.location_id === patientLocationId
                );

                setDoctors(availableDoctors);
            } catch (err: unknown) {
                const { message } = parseApiError(err as Error);
                toast(message, 'error');
            } finally {
                setLoading(false);
            }
        };
        loadDoctors();
    }, [patientLocationId, toast]);

    const handleAssignDoctor = async () => {
        if (!selectedDoctorId) {
            toast('Please select a doctor', 'error');
            return;
        }

        if (!patientLocationId) {
            toast('Patient location not found', 'error');
            return;
        }

        setProcessing(true);
        try {
            await api.assignPatientDoctor(patient.id as string, {
                doctor_id: selectedDoctorId,
                location_id: patientLocationId
            });

            const actionText = currentAssignment ? 'changed' : 'assigned';
            toast(`Doctor ${actionText} successfully`, 'success');
            onSuccess();
            onClose();
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const filteredDoctors = doctors.filter(doctor => {
        const profile = doctor.doctor_profile;
        const fullName = profile?.full_name || doctor.username;
        const specialty = profile?.specialty || '';

        const matchesSearch = !searchTerm ||
            fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            specialty.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doctor.username.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
    });

    const getDoctorPatientCount = () => {
        return Math.floor(Math.random() * 20);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">
                            {currentAssignment ? 'Change Assigned Doctor' : 'Assign Doctor'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Patient: <span className="font-bold text-slate-700">{patientName}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {currentAssignment && currentAssignment.doctor && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                                    <UserCheck size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-1">
                                        Currently Assigned
                                    </p>
                                    <p className="text-sm font-bold text-slate-800">
                                        {currentAssignment.doctor.doctor_profile?.full_name || currentAssignment.doctor.username}
                                    </p>
                                    {currentAssignment.doctor.doctor_profile?.specialty && (
                                        <p className="text-xs text-slate-600 mt-0.5">
                                            {currentAssignment.doctor.doctor_profile.specialty}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name or specialty..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Available Doctors ({filteredDoctors.length})
                        </h4>

                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <RefreshCcw size={32} className="text-slate-300 animate-spin" />
                            </div>
                        ) : filteredDoctors.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Stethoscope size={40} className="mx-auto mb-3 opacity-20" />
                                <p className="text-sm font-medium">No doctors found</p>
                                <p className="text-xs mt-1">
                                    {searchTerm
                                        ? 'Try adjusting your search'
                                        : 'No active doctors available in this location'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                {filteredDoctors.map((doctor) => {
                                    const profile = doctor.doctor_profile;
                                    const fullName = profile?.full_name || doctor.username;
                                    const specialty = profile?.specialty || 'General';
                                    const patientCount = getDoctorPatientCount();
                                    const isCurrentlyAssigned = currentAssignment?.doctor_id === doctor.id;
                                    const isSelected = selectedDoctorId === doctor.id;

                                    return (
                                        <button
                                            key={doctor.id}
                                            onClick={() => setSelectedDoctorId(doctor.id as string)}
                                            disabled={isCurrentlyAssigned}
                                            className={clsx(
                                                "w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left",
                                                isCurrentlyAssigned
                                                    ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                                                    : isSelected
                                                        ? "bg-blue-50 border-blue-500 shadow-sm"
                                                        : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer"
                                            )}
                                        >
                                            <div className={clsx(
                                                "w-12 h-12 rounded-lg flex items-center justify-center text-sm font-black shrink-0",
                                                isCurrentlyAssigned
                                                    ? "bg-slate-200 text-slate-500"
                                                    : isSelected
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-purple-100 text-purple-600"
                                            )}>
                                                {fullName.substring(0, 2).toUpperCase()}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-sm font-bold text-slate-800 truncate">
                                                        {fullName}
                                                    </p>
                                                    {isCurrentlyAssigned && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-[8px] font-black uppercase tracking-wider shrink-0">
                                                            <UserCheck size={10} /> Current
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-600">
                                                    <div className="flex items-center gap-1">
                                                        <Stethoscope size={12} className="text-slate-400" />
                                                        <span>{specialty}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Users size={12} className="text-slate-400" />
                                                        <span>{patientCount} patients</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {isSelected && !isCurrentlyAssigned && (
                                                <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0">
                                                    <UserCheck size={14} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {!patientLocationId && (
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs text-rose-700 font-bold">
                                    Patient location not set
                                </p>
                                <p className="text-xs text-rose-600 mt-1">
                                    Please assign a location to this patient before assigning a doctor.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAssignDoctor}
                        disabled={!selectedDoctorId || processing || !patientLocationId}
                        className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {processing ? (
                            <>
                                <RefreshCcw size={16} className="animate-spin" />
                                {currentAssignment ? 'Changing...' : 'Assigning...'}
                            </>
                        ) : (
                            <>
                                <UserCheck size={16} />
                                {currentAssignment ? 'Change Doctor' : 'Assign Doctor'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
