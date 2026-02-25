'use client';

import { useState, useCallback, useMemo } from 'react';
import { User } from '@/store/useStore';
import { X, Save, UserCircle, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import StandardInput from '@/components/shared/StandardInput';
import SelectInput from '@/components/shared/SelectInput';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { PatientIdentitySection } from './UserFormFields';
import ReviewSummaryTable from './ReviewSummaryTable';

interface EditUserModalProps {
    user: User;
    onClose: () => void;
    onSave: (userId: string, data: Partial<User>) => Promise<{ success: boolean, message?: string, fieldErrors?: Record<string, string> }>;
}

export default function EditUserModal({ user, onClose, onSave }: EditUserModalProps) {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [serverError, setServerError] = useState('');
    const [showPatientForm, setShowPatientForm] = useState(user.is_patient);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const getInitialRole = useCallback(() => {
        if (user.is_doctor) return 'doctor';
        if (user.is_operator) return 'operator';
        if (user.is_patient) return 'patient';
        return 'user';
    }, [user]);

    const initialRole = getInitialRole();

    const [formData, setFormData] = useState({
        username: user.username || '', email: user.email || '', role: initialRole,
        is_active: user.is_active, is_activated: user.is_activated, is_patient: user.is_patient,
        full_name: user.full_name || '', nik: user.nik || '', pob: user.pob || '', dob: user.dob || '',
        gender: user.gender || 'L', contact_number: user.contact_number || '', address: user.address || '', medical_history: user.medical_history || ''
    });

    const getChangedFields = useCallback(() => {
        const changes: { field: string; old: string; new: string }[] = [];

        const initialMap: Record<string, { label: string, value: string | number | boolean | null | undefined }> = {
            'username': { label: 'Username', value: user.username },
            'email': { label: 'Email', value: user.email },
            'role': { label: 'Role', value: initialRole },
            'is_active': { label: 'Status', value: user.is_active ? 'Active' : 'Inactive' }
        };

        const currentMap: Record<string, { label: string, value: string | number | boolean | null | undefined }> = {
            'username': { label: 'Username', value: formData.username },
            'email': { label: 'Email', value: formData.email },
            'role': { label: 'Role', value: formData.role },
            'is_active': { label: 'Status', value: formData.is_active ? 'Active' : 'Inactive' }
        };

        if (formData.role === 'patient') {
            Object.assign(initialMap, {
                'is_activated': { label: 'Verification', value: user.is_activated === 1 ? 'Full Access' : 'Restricted' },
                'full_name': { label: 'Full Name', value: user.full_name },
                'nik': { label: 'NIK', value: user.nik },
                'pob': { label: 'Place of Birth', value: user.pob },
                'dob': { label: 'Date of Birth', value: user.dob },
                'gender': { label: 'Gender', value: user.gender ? (user.gender === 'L' ? 'Male' : 'Female') : null },
                'contact_number': { label: 'Contact', value: user.contact_number },
                'address': { label: 'Address', value: user.address },
                'medical_history': { label: 'Medical History', value: user.medical_history }
            });
            Object.assign(currentMap, {
                'is_activated': { label: 'Verification', value: formData.is_activated === 1 ? 'Full Access' : 'Restricted' },
                'full_name': { label: 'Full Name', value: formData.full_name },
                'nik': { label: 'NIK', value: formData.nik },
                'pob': { label: 'Place of Birth', value: formData.pob },
                'dob': { label: 'Date of Birth', value: formData.dob },
                'gender': { label: 'Gender', value: formData.gender === 'L' ? 'Male' : 'Female' },
                'contact_number': { label: 'Contact', value: formData.contact_number },
                'address': { label: 'Address', value: formData.address },
                'medical_history': { label: 'Medical History', value: formData.medical_history }
            });
        }

        Object.keys(currentMap).forEach(key => {
            const oldVal = initialMap[key]?.value;
            const newVal = currentMap[key]?.value;

            const normOld = (oldVal === null || oldVal === undefined || oldVal === '') ? '' : String(oldVal).trim();
            const normNew = (newVal === null || newVal === undefined || newVal === '') ? '' : String(newVal).trim();

            if (normOld !== normNew) {
                changes.push({
                    field: initialMap[key]?.label || key,
                    old: normOld === '' ? '-' : normOld,
                    new: normNew === '' ? '-' : normNew
                });
            }
        });
        return changes;
    }, [formData, initialRole, user]);

    const hasChanges = useMemo(() => getChangedFields().length > 0, [getChangedFields]);

    const validateField = (field: string, value: string) => {
        if (field === 'username' && value.length > 0 && value.length < 3) return "Min 3 characters";
        if (field === 'email' && value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email format";
        return "";
    };

    const handleFieldChange = useCallback((field: string, value: string | number | boolean) => {
        setFormData(prev => {
            const newState = { ...prev, [field]: value };
            if (field === 'role') {
                if (value === getInitialRole()) newState.is_activated = user.is_activated;
                else if (user.is_patient && value !== 'patient') newState.is_activated = 0;
                setShowPatientForm(value === 'patient');
            }
            return newState;
        });
        const err = typeof value === 'string' ? validateField(field, value) : "";
        setErrors(prev => ({ ...prev, [field]: err }));
    }, [getInitialRole, user.is_patient, user.is_activated]);

    const executeSave = async () => {
        setIsConfirmOpen(false);
        setLoading(true);
        setErrors({});
        setServerError('');

        const isNewlyPatient = formData.role === 'patient' && !user.is_patient;
        const payload: Partial<User> = {
            username: formData.username, email: formData.email, role: formData.role,
            is_active: formData.is_active, is_activated: formData.is_activated,
            is_patient: formData.role === 'patient', is_doctor: formData.role === 'doctor', is_operator: formData.role === 'operator',
            ...((formData.role === 'patient' && (isNewlyPatient || showPatientForm)) && {
                full_name: formData.full_name, nik: formData.nik, pob: formData.pob, dob: formData.dob,
                gender: formData.gender, address: formData.address || undefined,
                contact_number: formData.contact_number || undefined, medical_history: formData.medical_history || undefined
            })
        };

        const result = await onSave(user.id || '', payload);
        if (result.success) onClose();
        else {
            setErrors(result.fieldErrors || {});
            if (result.message && !result.fieldErrors) setServerError(result.message);
            setLoading(false);
        }
    };

    const handleConfirmSave = () => {
        executeSave();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        if (!formData.username) newErrors.username = 'Required';
        if (!formData.email) newErrors.email = 'Required';

        if (formData.role === 'patient') {
            if (!formData.full_name) newErrors.full_name = 'Required';
            if (!formData.nik) newErrors.nik = 'Required';
            else if (formData.nik.length !== 16) newErrors.nik = 'Must be 16 digits';
            if (!formData.pob) newErrors.pob = 'Required';
            if (!formData.dob) newErrors.dob = 'Required';
        }

        if (Object.keys(newErrors).length > 0) {
            if (formData.role === 'patient' && !showPatientForm) {
                setShowPatientForm(true);
            }
            return setErrors(newErrors);
        }

        if (hasChanges) setIsConfirmOpen(true);
        else onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div><h2 className="text-lg font-black text-slate-800 tracking-tight">Edit User Account</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">User ID: {user.id}</p></div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto custom-scrollbar" noValidate>
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Account Credentials</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StandardInput label="Username" value={formData.username} onChange={e => handleFieldChange('username', e.target.value)} errorMessage={errors.username} placeholder="Username" />
                            <StandardInput label="Email Address" value={formData.email} onChange={e => handleFieldChange('email', e.target.value)} errorMessage={errors.email} placeholder="Email" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SelectInput label="Access Level" value={formData.role} onChange={e => handleFieldChange('role', e.target.value)} options={[{ value: 'user', label: 'User (Standard Account)' }, { value: 'patient', label: 'Patient' }, { value: 'operator', label: 'Operator (Nurse / General Doctor)' }, { value: 'doctor', label: 'Specialist (Doctor Specialist)' }]} />
                            <div className="flex items-end pb-1"><label className="flex items-center justify-between w-full p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer group"><span className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Account Active</span><div className={clsx("w-10 h-5 rounded-full relative transition-colors duration-200 shrink-0", formData.is_active ? "bg-emerald-500" : "bg-slate-200")}><input type="checkbox" className="sr-only" checked={formData.is_active} onChange={e => handleFieldChange('is_active', e.target.checked)} /><div className={clsx("absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-200 shadow-sm", formData.is_active && "translate-x-5")} /></div></label></div>
                        </div>
                    </div>

                    {formData.role === 'patient' && (
                        <div className="space-y-4 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient Identity</h3>
                                    {user.status && (
                                        <span className={clsx(
                                            "ml-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border",
                                            user.status === 'APPROVED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                user.status === 'REJECTED' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                                    "bg-amber-50 text-amber-600 border-amber-100"
                                        )}>
                                            {user.status}
                                        </span>
                                    )}
                                </div>
                                <button type="button" onClick={() => setShowPatientForm(!showPatientForm)} className={clsx("flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", showPatientForm ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100")}>{showPatientForm ? <><ChevronUp size={14} /> Hide Details</> : <><UserCircle size={14} /> {user.is_patient ? "Edit Patient Profile" : "Add Patient Profile"}</>}</button>
                            </div>

                            {user.status === 'REJECTED' && user.rejection_reason && (
                                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                    <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 shrink-0">
                                        <X size={16} strokeWidth={3} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-rose-800 uppercase tracking-tight">Current Rejection Reason</p>
                                        <p className="text-[11px] font-bold text-rose-600 leading-tight mt-0.5 italic">&quot;{user.rejection_reason}&quot;</p>
                                    </div>
                                </div>
                            )}

                            {showPatientForm && <PatientIdentitySection formData={formData} errors={errors} handleFieldChange={handleFieldChange} />}
                        </div>
                    )}

                    <div className="pt-4 pb-6 -bottom-6 sticky bg-white z-10 border-t border-slate-50 mt-4">
                        {serverError && !Object.keys(errors).length && <p className="text-[10px] font-bold text-rose-500 text-center mb-2">{serverError}</p>}
                        <button type="submit" disabled={loading} className={clsx("w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2", hasChanges ? "bg-slate-900 hover:bg-blue-600 text-white" : "bg-slate-100 text-slate-400 cursor-not-allowed")}>
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save size={16} /> Update Account & Profile</>}
                        </button>
                    </div>
                </form>
            </div>

            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={handleConfirmSave} title="Review Account Changes"
                message={<div className="space-y-4"><p className="text-sm text-slate-500 font-medium">Review changes to <span className="font-bold text-slate-700">@{user.username}</span>.{initialRole === 'patient' && formData.role !== 'patient' && <span className="text-rose-600 font-bold block mt-2 underline decoration-2 decoration-rose-200 underline-offset-4">DANGER: Role change from Patient will DELETE ALL medical data.</span>}</p>
                    <ReviewSummaryTable changes={getChangedFields()} /></div>} confirmText="Confirm & Save Changes" isDestructive={initialRole === 'patient' && formData.role !== 'patient'} />
        </div>
    );
}
