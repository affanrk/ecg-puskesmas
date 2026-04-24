'use client';

import { useState, useEffect, useRef } from 'react';
import { X, User as UserIcon, Mail, Phone, Calendar, FileText } from 'lucide-react';
import { User } from '@/types/user';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { parseApiError } from '@/utils/helpers';
import PatientDoctorAssignment from '@/components/admin/patients/parts/PatientDoctorAssignment';

interface PatientDetailModalProps {
    patientId: string;
    onClose: () => void;
    onUpdate?: () => void;
}

export default function PatientDetailModal({ patientId, onClose, onUpdate }: PatientDetailModalProps) {
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
                    onClose();
                }
            } catch (err: unknown) {
                const { message } = parseApiError(err as Error);
                toast(message, 'error');
                onClose();
            } finally {
                setLoading(false);
            }
        };
        loadPatient();
    }, [patientId, toast, onClose]);

    const handleAssignmentChange = () => {
        if (onUpdate) {
            onUpdate();
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-8">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-slate-400">Loading patient details...</div>
                    </div>
                </div>
            </div>
        );
    }

    if (!patient) {
        return null;
    }

    const profile = patient.patient_profile;
    const fullName = profile?.full_name || patient.username;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 tracking-tight">
                            Patient Details
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            View patient information and manage doctor assignment
                        </p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Patient Header Card */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                        <div className="flex items-start gap-4">
                            <div className="w-20 h-20 bg-rose-600 text-white rounded-xl flex items-center justify-center text-2xl font-black shrink-0">
                                {fullName.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h1 className="text-2xl font-black text-slate-800 mb-2">
                                    {fullName}
                                </h1>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <UserIcon size={16} className="text-slate-400" />
                                        <span>@{patient.username}</span>
                                    </div>
                                    {patient.email && patient.email !== 'N/A' && (
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Mail size={16} className="text-slate-400" />
                                            <span className="truncate">{patient.email}</span>
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
                        {/* Patient Information */}
                        <div className="space-y-6">
                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                                <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                    <FileText size={18} className="text-slate-400" />
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
                                    {profile?.pob && (
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                                Place of Birth
                                            </p>
                                            <p className="text-sm text-slate-700 font-medium">
                                                {profile.pob}
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
                                    {profile?.medical_history && (
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                                Medical History
                                            </p>
                                            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                                {profile.medical_history}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Doctor Assignment */}
                        <div className="space-y-6">
                            <PatientDoctorAssignment 
                                patient={patient}
                                onAssignmentChange={handleAssignmentChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
