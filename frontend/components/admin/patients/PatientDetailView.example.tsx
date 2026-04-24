'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from '@/types/user';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { parseApiError } from '@/utils/helpers';
import PatientDoctorAssignment from './parts/PatientDoctorAssignment';
import { User as UserIcon, Mail, Phone, Calendar } from 'lucide-react';

interface PatientDetailViewProps {
    patientId: string;
    onClose?: () => void;
}

export default function PatientDetailView({ patientId, onClose }: PatientDetailViewProps) {
    const { show: toast } = useToast();
    const [patient, setPatient] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const loadPatient = async () => {
            setLoading(true);
            try {
                const response = await api.fetchUsers({ limit: 1000, t: Date.now() });
                const allUsers = Array.isArray(response) ? response : response?.data || [];
                const foundPatient = allUsers.find((u: User) => u.id === patientId);
                
                if (foundPatient) {
                    setPatient(foundPatient);
                } else {
                    toast('Patient not found', 'error');
                }
            } catch (err: unknown) {
                const { message } = parseApiError(err as Error);
                toast(message, 'error');
            } finally {
                setLoading(false);
            }
        };
        loadPatient();
    }, [patientId, toast]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Loading patient details...</div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-slate-400">Patient not found</div>
            </div>
        );
    }

    const profile = patient.patient_profile;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <div className="flex items-start gap-4">
                    <div className="w-20 h-20 bg-rose-600 text-white rounded-xl flex items-center justify-center text-2xl font-black">
                        {(profile?.full_name || patient.username).substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-black text-slate-800 mb-2">
                            {profile?.full_name || patient.username}
                        </h1>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                                <UserIcon size={16} className="text-slate-400" />
                                <span>@{patient.username}</span>
                            </div>
                            {patient.email && (
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Mail size={16} className="text-slate-400" />
                                    <span>{patient.email}</span>
                                </div>
                            )}
                            {profile?.contact_number && (
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Phone size={16} className="text-slate-400" />
                                    <span>{profile.contact_number}</span>
                                </div>
                            )}
                            {profile?.dob && (
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Calendar size={16} className="text-slate-400" />
                                    <span>{new Date(profile.dob).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                        <h2 className="text-lg font-black text-slate-800 mb-4">
                            Patient Information
                        </h2>
                        <div className="space-y-3">
                            {profile?.nik && (
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                        NIK
                                    </p>
                                    <p className="text-sm text-slate-700 font-medium">
                                        {profile.nik}
                                    </p>
                                </div>
                            )}
                            {profile?.gender && (
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                        Gender
                                    </p>
                                    <p className="text-sm text-slate-700 font-medium">
                                        {profile.gender === 'L' ? 'Male' : 'Female'}
                                    </p>
                                </div>
                            )}
                            {profile?.address && (
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                        Address
                                    </p>
                                    <p className="text-sm text-slate-700">
                                        {profile.address}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <PatientDoctorAssignment 
                        patient={patient}
                        onAssignmentChange={() => {
                            console.log('Doctor assignment changed');
                        }}
                    />
                </div>
            </div>

            {onClose && (
                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}
