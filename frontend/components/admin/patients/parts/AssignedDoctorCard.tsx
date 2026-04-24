'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { UserCheck, Stethoscope, Calendar, User as UserIcon, RefreshCcw, UserPlus, AlertCircle } from 'lucide-react';
import { User, PatientDoctorResponse } from '@/types/user';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { parseApiError } from '@/utils/helpers';
import DoctorSelectionModal from './DoctorSelectionModal';
import clsx from 'clsx';

interface AssignedDoctorCardProps {
    patient: User;
    onAssignmentChange?: () => void;
}

export default function AssignedDoctorCard({ patient, onAssignmentChange }: AssignedDoctorCardProps) {
    const { show: toast } = useToast();
    const [assignment, setAssignment] = useState<PatientDoctorResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDoctorModal, setShowDoctorModal] = useState(false);
    const initialized = useRef(false);

    const loadAssignment = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.fetchPatientDoctors(patient.id as string);
            const data = Array.isArray(response) ? response : response?.data || [];
            
            const activeAssignment = data.find((a: PatientDoctorResponse) => a.is_active);
            setAssignment(activeAssignment || null);
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            if (!message.includes('404') && !message.includes('not found')) {
                toast(message, 'error');
            }
            setAssignment(null);
        } finally {
            setLoading(false);
        }
    }, [patient.id, toast]);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;
        loadAssignment();
    }, [loadAssignment]);

    const handleAssignmentSuccess = () => {
        loadAssignment();
        if (onAssignmentChange) {
            onAssignmentChange();
        }
    };

    const formatDate = (dateString: string | Date) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    if (loading) {
        return (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-center py-8">
                    <RefreshCcw size={24} className="text-slate-300 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                            <Stethoscope size={16} />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 tracking-tight">
                            Assigned Doctor
                        </h3>
                    </div>
                    <button
                        onClick={() => setShowDoctorModal(true)}
                        className={clsx(
                            "px-3 py-1.5 rounded text-[9px] font-black uppercase tracking-widest transition-all active:scale-[0.98] border flex items-center gap-1.5",
                            assignment
                                ? "bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 hover:text-blue-700"
                                : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 hover:text-emerald-700"
                        )}
                    >
                        {assignment ? (
                            <>
                                <UserCheck size={10} /> Change Doctor
                            </>
                        ) : (
                            <>
                                <UserPlus size={10} /> Assign Doctor
                            </>
                        )}
                    </button>
                </div>

                <div className="p-6">
                    {assignment && assignment.doctor ? (
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 bg-purple-600 text-white rounded-xl flex items-center justify-center text-lg font-black shrink-0 shadow-sm">
                                    {(assignment.doctor.doctor_profile?.full_name || assignment.doctor.username)
                                        .substring(0, 2)
                                        .toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-lg font-bold text-slate-800 mb-1">
                                        {assignment.doctor.doctor_profile?.full_name || assignment.doctor.username}
                                    </h4>
                                    {assignment.doctor.doctor_profile?.specialty && (
                                        <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-2">
                                            <Stethoscope size={14} className="text-slate-400" />
                                            <span>{assignment.doctor.doctor_profile.specialty}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <UserIcon size={12} className="text-slate-400" />
                                        <span>@{assignment.doctor.username}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                        Assigned Date
                                    </p>
                                    <div className="flex items-center gap-1.5 text-sm text-slate-700">
                                        <Calendar size={14} className="text-slate-400" />
                                        <span className="font-medium">
                                            {formatDate(assignment.assigned_dt)}
                                        </span>
                                    </div>
                                </div>
                                {assignment.assigned_by && (
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                                            Assigned By
                                        </p>
                                        <p className="text-sm text-slate-700 font-medium">
                                            Admin
                                        </p>
                                    </div>
                                )}
                            </div>

                            {assignment.notes && (
                                <div className="pt-4 border-t border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                                        Notes
                                    </p>
                                    <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                        {assignment.notes}
                                    </p>
                                </div>
                            )}

                            {assignment.doctor.email && (
                                <div className="pt-4 border-t border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                                        Contact
                                    </p>
                                    <div className="space-y-1">
                                        <p className="text-sm text-slate-600">
                                            <span className="font-medium">Email:</span>{' '}
                                            <a 
                                                href={`mailto:${assignment.doctor.email}`}
                                                className="text-blue-600 hover:text-blue-700 hover:underline"
                                            >
                                                {assignment.doctor.email}
                                            </a>
                                        </p>
                                        {assignment.doctor.doctor_profile?.contact_number && (
                                            <p className="text-sm text-slate-600">
                                                <span className="font-medium">Phone:</span>{' '}
                                                {assignment.doctor.doctor_profile.contact_number}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle size={32} className="text-slate-300" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-700 mb-1">
                                No Doctor Assigned
                            </h4>
                            <p className="text-xs text-slate-500 mb-4">
                                This patient doesn&apos;t have an assigned doctor yet.
                            </p>
                            <button
                                onClick={() => setShowDoctorModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all"
                            >
                                <UserPlus size={16} />
                                Assign Doctor
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {showDoctorModal && (
                <DoctorSelectionModal
                    patient={patient}
                    currentAssignment={assignment}
                    onClose={() => setShowDoctorModal(false)}
                    onSuccess={handleAssignmentSuccess}
                />
            )}
        </>
    );
}
