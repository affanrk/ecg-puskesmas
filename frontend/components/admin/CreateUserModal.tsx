'use client';

import { useState, useCallback } from 'react';
import { X, UserPlus } from 'lucide-react';
import { User } from '@/store/useStore';
import StandardInput from '@/components/shared/StandardInput';
import SelectInput from '@/components/shared/SelectInput';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { PatientIdentitySection } from './UserFormFields';
import ReviewSummaryTable from './ReviewSummaryTable';

interface CreateUserModalProps {
    onClose: () => void;
    onSave: (data: Partial<User> & { password?: string }) => Promise<{ success: boolean, message?: string, fieldErrors?: Record<string, string> }>;
}

export default function CreateUserModal({ onClose, onSave }: CreateUserModalProps) {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [serverError, setServerError] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const [formData, setFormData] = useState({
        username: '', email: '', password: '', role: 'user', is_active: true, is_activated: 0,
        full_name: '', nik: '', pob: '', dob: '', gender: 'L', contact_number: '', address: '', medical_history: ''
    });

    const validateField = (field: string, value: string) => {
        if (field === 'username') {
            if (value.length > 0 && value.length < 3) return "Min 3 characters";
            if (value.length > 0 && !/^[a-zA-Z0-9_-]+$/.test(value)) return "Alpha-numeric and _ - only";
        } else if (field === 'email') {
            if (value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email format";
        } else if (field === 'password') {
            if (!value) return "";
            if (value.length < 8) return "Min 8 characters";
            if (!/[A-Z]/.test(value)) return "Need 1 uppercase letter";
            if (!/\d/.test(value)) return "Need 1 number";
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return "Need 1 symbol";
        }
        return "";
    };

    const handleFieldChange = useCallback((field: string, value: string | number | boolean) => {
        setFormData(prev => {
            const newState = { ...prev, [field]: value };

            if (field === 'role' && value !== 'patient') {
                newState.is_activated = 0;
            }

            return newState;
        });
        const err = typeof value === 'string' ? validateField(field, value) : "";
        setErrors(prev => ({ ...prev, [field]: err }));
    }, []);

    const executeSave = async () => {
        setIsConfirmOpen(false);
        setLoading(true);
        setErrors({});
        setServerError('');

        const isPatient = formData.role === 'patient';
        const payload: Partial<User> & { password?: string } = {
            username: formData.username, email: formData.email, password: formData.password, role: formData.role,
            is_active: formData.is_active, is_activated: formData.is_activated, is_patient: isPatient,
            is_doctor: formData.role === 'doctor', is_operator: formData.role === 'operator',
            ...(isPatient && {
                full_name: formData.full_name, nik: formData.nik, pob: formData.pob, dob: formData.dob,
                gender: formData.gender, address: formData.address || undefined,
                contact_number: formData.contact_number || undefined, medical_history: formData.medical_history || undefined
            })
        };

        const result = await onSave(payload);
        if (result.success) onClose();
        else {
            setErrors(result.fieldErrors || {});
            if (result.message && !result.fieldErrors) setServerError(result.message);
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        ['username', 'email', 'password'].forEach(f => {
            const err = !formData[f as keyof typeof formData] ? "Required" : validateField(f, formData[f as keyof typeof formData] as string);
            if (err) newErrors[f] = err;
        });

        if (formData.role === 'patient') {
            if (!formData.full_name) newErrors.full_name = 'Required';
            if (!formData.nik) newErrors.nik = 'Required';
            else if (formData.nik.length !== 16) newErrors.nik = 'Must be 16 digits';
            if (!formData.pob) newErrors.pob = 'Required';
            if (!formData.dob) newErrors.dob = 'Required';
        }

        if (Object.keys(newErrors).length > 0) return setErrors(newErrors);
        setIsConfirmOpen(true);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div><h2 className="text-lg font-black text-slate-800 tracking-tight">Create New User</h2></div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto custom-scrollbar" noValidate>
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Account Credentials
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StandardInput label="Username" value={formData.username} onChange={e => handleFieldChange('username', e.target.value)} errorMessage={errors.username} placeholder="Unique username" />
                            <StandardInput label="Email Address" type="email" value={formData.email} onChange={e => handleFieldChange('email', e.target.value)} errorMessage={errors.email} placeholder="user@example.com" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StandardInput label="Password" type="password" value={formData.password} onChange={e => handleFieldChange('password', e.target.value)} errorMessage={errors.password} placeholder="Secure password" />
                            <SelectInput label="Access Level" value={formData.role} onChange={e => handleFieldChange('role', e.target.value)} options={[
                                { value: 'user', label: 'User (Standard Account)' }, { value: 'patient', label: 'Patient' },
                                { value: 'operator', label: 'Operator (Nurse / General Doctor)' }, { value: 'doctor', label: 'Specialist (Doctor Specialist)' }
                            ]} />
                        </div>
                    </div>

                    {formData.role === 'patient' && (
                        <div className="space-y-4 pt-2 border-t border-slate-50">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Personal Information
                            </h3>
                            <PatientIdentitySection formData={formData} errors={errors} handleFieldChange={handleFieldChange} />
                        </div>
                    )}

                    <div className="pt-2 sticky bottom-0 bg-white py-2">
                        {serverError && !Object.keys(errors).length && <p className="text-[10px] font-bold text-rose-500 text-center mb-2">{serverError}</p>}
                        <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><UserPlus size={16} /> Review & Create Account</>}
                        </button>
                    </div>
                </form>
            </div>

            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={executeSave} title="Review New Account"
                message={<div className="space-y-4"><p className="text-sm text-slate-500 font-medium">Verify @{formData.username} information before finalizing.</p>
                    <ReviewSummaryTable data={[
                        { field: 'Username', value: formData.username }, { field: 'Email', value: formData.email },
                        { field: 'Role', value: formData.role.toUpperCase() }, { field: 'Account Status', value: formData.is_active ? 'Active' : 'Inactive' },
                        ...(formData.role === 'patient' ? [
                            { field: 'Verification', value: formData.is_activated === 1 ? 'Full Access (Auto-Approved)' : 'Restricted (Queue)' },
                            { field: 'NIK', value: formData.nik },
                            { field: 'Full Name', value: formData.full_name }
                        ] : [])
                    ]} />
                </div>} confirmText="Create User Account" />
        </div>
    );
}
