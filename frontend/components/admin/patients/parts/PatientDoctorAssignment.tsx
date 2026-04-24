'use client';

import { useState } from 'react';
import { User, PatientDoctorResponse } from '@/types/user';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { parseApiError } from '@/utils/helpers';
import AssignedDoctorCard from './AssignedDoctorCard';
import DoctorSelectionModal from './DoctorSelectionModal';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { Trash2 } from 'lucide-react';

interface PatientDoctorAssignmentProps {
    patient: User;
    onAssignmentChange?: () => void;
}

export default function PatientDoctorAssignment({ 
    patient, 
    onAssignmentChange 
}: PatientDoctorAssignmentProps) {
    const { show: toast } = useToast();
    const [showDoctorModal, setShowDoctorModal] = useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
    const [currentAssignment, setCurrentAssignment] = useState<PatientDoctorResponse | null>(null);
    const [isRemoving, setIsRemoving] = useState(false);

    const handleRemoveDoctor = async () => {
        if (!currentAssignment) return;

        setIsRemoving(true);
        try {
            await api.removePatientDoctor(
                patient.id as string, 
                currentAssignment.doctor_id
            );
            toast('Doctor assignment removed successfully', 'success');
            setShowRemoveConfirm(false);
            setCurrentAssignment(null);
            if (onAssignmentChange) {
                onAssignmentChange();
            }
        } catch (err: unknown) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setIsRemoving(false);
        }
    };

    const handleAssignmentUpdate = (assignment: PatientDoctorResponse | null) => {
        setCurrentAssignment(assignment);
        if (onAssignmentChange) {
            onAssignmentChange();
        }
    };

    return (
        <div className="space-y-4">
            <AssignedDoctorCard 
                patient={patient} 
                onAssignmentChange={() => handleAssignmentUpdate(null)}
            />

            {currentAssignment && (
                <div className="flex justify-end">
                    <button
                        onClick={() => setShowRemoveConfirm(true)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded text-[9px] font-black uppercase tracking-widest hover:bg-red-100 hover:text-red-700 transition-all active:scale-[0.98] border border-red-100 cursor-pointer flex items-center gap-1.5"
                    >
                        <Trash2 size={10} /> Remove Assignment
                    </button>
                </div>
            )}

            <ConfirmationModal
                isOpen={showRemoveConfirm}
                onClose={() => setShowRemoveConfirm(false)}
                onConfirm={handleRemoveDoctor}
                title="Remove Doctor Assignment?"
                message={
                    <div className="space-y-3">
                        <p className="text-slate-600">
                            Are you sure you want to remove the doctor assignment for this patient?
                        </p>
                        {currentAssignment?.doctor && (
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">
                                    Current Doctor
                                </p>
                                <p className="text-sm font-bold text-slate-800">
                                    {currentAssignment.doctor.doctor_profile?.full_name || 
                                     currentAssignment.doctor.username}
                                </p>
                            </div>
                        )}
                        <p className="text-sm text-amber-600 font-medium bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                            ⚠️ The assignment will be archived for audit purposes.
                        </p>
                    </div>
                }
                confirmText="Remove Assignment"
                isDestructive={false}
                warningLevel="standard"
                isLoading={isRemoving}
            />

            {showDoctorModal && (
                <DoctorSelectionModal
                    patient={patient}
                    currentAssignment={currentAssignment}
                    onClose={() => setShowDoctorModal(false)}
                    onSuccess={() => handleAssignmentUpdate(null)}
                />
            )}
        </div>
    );
}
