'use client';

import { useState, useCallback } from 'react';

import { X, UserPlus } from 'lucide-react';
import clsx from 'clsx';

import ReviewSummaryTable from '../../../shared/ReviewSummaryTable';
import { PatientIdentitySection } from './UserFormFields';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import SelectInput from '@/components/shared/SelectInput';
import StandardInput from '@/components/shared/StandardInput';
import { User, UserFormPayload, LocationResponse } from '@/types/user';
import { validators } from '@/utils/validators';
import { ERROR_CODES } from '@/config/constants';

interface CreateUserModalProps {
    onClose: () => void;
    onSave: (data: Partial<User> & { password?: string }) => Promise<{ success: boolean, message?: string, fieldErrors?: Record<string, string>, errorCode?: string }>;
    adminLocation: LocationResponse | null;
}

const userRoleOptions = [
    { value: 'user', label: 'User (Standard Account)' },
    { value: 'patient', label: 'Patient' }
];

const LocationDisplay = ({ adminLocation }: { adminLocation: LocationResponse | null }) => (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-xs font-bold text-slate-700">Primary Location</p>
                <p className="text-sm font-black text-slate-900 mt-1">
                    {adminLocation?.name || 'Loading...'}
                </p>
                {adminLocation?.address && (
                    <p className="text-xs text-slate-500 mt-0.5">{adminLocation.address}</p>
                )}
            </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
            User will be assigned to your location automatically.
        </p>
    </div>
);

export default function CreateUserModal({ onClose, onSave, adminLocation }: CreateUserModalProps) {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [serverError, setServerError] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const [formData, setFormData] = useState({
        username: '', email: '', password: '', role: '', account_status: 'ACTIVE', activation_status: 'REJECT',
        full_name: '', nik: '', pob: '', dob: '', gender: '', contact_number: '', address: '', medical_history: ''
    });

    const validateField = (field: string, value: string) => {
        if (field === 'username') return validators.username(value);
        if (field === 'email') return validators.email(value);
        if (field === 'password' && value) return validators.password(value);
        if (field === 'full_name') return validators.name(value);
        if (field === 'nik') return validators.nik(value);
        if (field === 'pob') return validators.required(value);
        if (field === 'dob') return validators.dob(value);
        if (field === 'contact_number') return validators.phone(value);
        return "";
    };

    const handleFieldChange = useCallback((field: string, value: string | number | boolean) => {
        setFormData(prev => {
            const newState = { ...prev, [field]: value };

            if (field === 'role') {
                newState.activation_status = 'REJECT';
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

        const payload: UserFormPayload = {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            account_status: formData.account_status,
            activation_status: formData.activation_status,
            ...(formData.role === 'patient') && {
                full_name: formData.full_name, nik: formData.nik, pob: formData.pob, dob: formData.dob,
                gender: formData.gender, address: formData.address || undefined,
                contact_number: formData.contact_number || undefined, medical_history: formData.medical_history || undefined
            }
        };

        const result = await onSave(payload);
        if (result.success) onClose();
        else {
            if (result.errorCode === ERROR_CODES.PRIMARY_LOCATION_EXISTS) {
                setServerError('This user already has a primary location assigned. Please use "Add Existing Staff" feature instead.');
            } else {
                setErrors(result.fieldErrors || {});
                if (result.message && !Object.keys(result.fieldErrors || {}).length) setServerError(result.message);
            }
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        ['username', 'email', 'role'].forEach(f => {
            let err = "";
            if (f === 'role' && !formData.role) err = "Required";
            else err = validateField(f, formData[f as keyof typeof formData] as string);
            if (err) newErrors[f] = err;
        });

        if (formData.password) {
            const passwordErr = validators.password(formData.password);
            if (passwordErr) newErrors.password = passwordErr;
        }

        if (formData.role === 'patient') {
            const nameErr = validators.name(formData.full_name);
            if (nameErr) newErrors.full_name = nameErr;

            const nikErr = validators.nik(formData.nik);
            if (nikErr) newErrors.nik = nikErr;

            if (validators.required(formData.pob)) newErrors.pob = 'Required';

            const dobErr = validators.dob(formData.dob);
            if (dobErr) newErrors.dob = dobErr;

            if (validators.required(formData.gender)) newErrors.gender = 'Required';
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
                    <button onClick={onClose} className="p-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 border border-rose-100 hover:border-rose-200 transition-all cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto custom-scrollbar" noValidate>
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Account Credentials
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StandardInput label="Username" value={formData.username} onChange={e => handleFieldChange('username', e.target.value)} errorMessage={errors.username} placeholder="Unique username" required />
                            <StandardInput label="Email Address" type="email" value={formData.email} onChange={e => handleFieldChange('email', e.target.value)} errorMessage={errors.email} placeholder="user@example.com" required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StandardInput label="Password" type="password" value={formData.password} onChange={e => handleFieldChange('password', e.target.value)} errorMessage={errors.password} placeholder="Leave empty for default (user1234)" />
                            <SelectInput label="Access Level" value={formData.role} onChange={e => handleFieldChange('role', e.target.value)} options={[{ value: '', label: 'Select Access Level' }, ...userRoleOptions]} errorMessage={errors.role} required />
                        </div>
                    </div>

                    {formData.role === 'patient' && (
                        <div className="space-y-4 pt-2 border-t border-slate-50">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Personal Information
                            </h3>
                            <PatientIdentitySection formData={formData} errors={errors} handleFieldChange={handleFieldChange} showVerification={false} />
                        </div>
                    )}

                    {formData.role === 'user' && (
                        <div className="pt-2 border-t border-slate-50">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Location Information
                            </h4>
                            <LocationDisplay adminLocation={adminLocation} />
                        </div>
                    )}

                    {formData.role === 'patient' && (
                        <div className="pt-2 border-t border-slate-50">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Location & Access
                            </h4>
                            
                            <div className="mb-4">
                                <LocationDisplay adminLocation={adminLocation} />
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group bg-white">
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                                        Grant Full Access
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        {formData.activation_status === 'APPROVE' 
                                            ? 'Patient can access system immediately' 
                                            : 'Patient requires approval before accessing system'}
                                    </p>
                                </div>
                                <label className="flex items-center cursor-pointer">
                                    <div className={clsx(
                                        "w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0",
                                        formData.activation_status === 'APPROVE' ? "bg-emerald-500" : "bg-slate-200"
                                    )}>
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={formData.activation_status === 'APPROVE'}
                                            onChange={(e) => handleFieldChange('activation_status', e.target.checked ? 'APPROVE' : 'REJECT')}
                                        />
                                        <div className={clsx(
                                            "absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-200 shadow-sm",
                                            formData.activation_status === 'APPROVE' && "translate-x-5"
                                        )} />
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 pb-6 -bottom-6 sticky bg-white z-10 border-t border-slate-50 mt-4">
                        {serverError && !Object.keys(errors).length && <p className="text-[10px] font-bold text-rose-500 text-center mb-2">{serverError}</p>}
                        <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
                            {loading ? <><div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin cursor-not-allowed" /> Creating Account...</> : <><UserPlus size={16} /> Review & Create Account</>}
                        </button>
                    </div>
                </form>
            </div>

            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={executeSave} title="Review New Account"
                message={<div className="space-y-4"><p className="text-sm text-slate-500 font-medium">Verify @{formData.username} information before finalizing.</p>
                    <ReviewSummaryTable data={[
                        { field: 'Username', value: formData.username }, { field: 'Email', value: formData.email },
                        { field: 'Password', value: formData.password ? '••••••••' : 'user1234 (default)' },
                        { field: 'Role', value: formData.role.toUpperCase() }, { field: 'Account Status', value: formData.account_status },
                        ...(formData.role === 'patient' ? [
                            { field: 'Verification Status', value: formData.activation_status === 'APPROVE' ? 'FULL-ACCESS (Auto-Approved)' : 'RESTRICTED (Queue)' },
                            { field: 'NIK', value: formData.nik },
                            { field: 'Full Name', value: formData.full_name }
                        ] : [])
                    ]} />
                </div>} confirmText="Create User Account" />
        </div>
    );
}
