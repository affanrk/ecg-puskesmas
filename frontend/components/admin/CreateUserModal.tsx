'use client';

import { useState } from 'react';
import { X, UserPlus, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import { User } from '@/store/useStore';
import FlatpickrInput from '@/components/shared/FlatpickrInput';

interface CreateUserModalProps {
    onClose: () => void;
    onSave: (data: Partial<User> & { password?: string }) => Promise<{ success: boolean, message?: string, fieldErrors?: Record<string, string> }>;
}

export default function CreateUserModal({ onClose, onSave }: CreateUserModalProps) {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [serverError, setServerError] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'user',
        is_active: true,
        is_activated: 0,
        is_patient: false,

        full_name: '',
        nik: '',
        pob: '',
        dob: '',
        gender: 'L',
        contact_number: '',
        address: '',
        medical_history: ''
    });

    const validateField = (field: string, value: string) => {
        let error = "";
        switch (field) {
            case 'username':
                if (value.length > 0 && value.length < 3) error = "Min 3 characters";
                else if (value.length > 0 && !/^[a-zA-Z0-9_-]+$/.test(value)) error = "Alpha-numeric and _ - only";
                break;
            case 'email':
                if (value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Invalid email format";
                break;
            case 'password':
                if (!value) return "";
                if (value.length < 8) return "Min 8 characters";
                if (!/[A-Z]/.test(value)) return "Need 1 uppercase letter";
                if (!/\d/.test(value)) return "Need 1 number";
                if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return "Need 1 symbol";
                break;
        }
        return error;
    };

    const handleFieldChange = (field: keyof typeof formData, value: string | number | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        if (typeof value === 'string' && ['username', 'email', 'password'].includes(field as string)) {
            const error = validateField(field as string, value);
            setErrors(prev => ({ ...prev, [field]: error }));
        } else {
            if (value && errors[field as string]) {
                setErrors(prev => {
                    const newErr = { ...prev };
                    delete newErr[field as string];
                    return newErr;
                });
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        setServerError('');
        
        const newErrors: Record<string, string> = {};

        if (!formData.username) newErrors.username = 'Username is required';
        else {
            const usernameError = validateField('username', formData.username);
            if (usernameError) newErrors.username = usernameError;
        }

        if (!formData.email) newErrors.email = 'Email is required';
        else {
            const emailError = validateField('email', formData.email);
            if (emailError) newErrors.email = emailError;
        }

        if (!formData.password) newErrors.password = 'Password is required';
        else {
            const pwdError = validateField('password', formData.password);
            if (pwdError) newErrors.password = pwdError;
        }

        if (formData.role === 'patient') {
            if (!formData.full_name) newErrors.full_name = 'Full Name is required';
            if (!formData.nik) newErrors.nik = 'NIK is required';
            else if (formData.nik.length !== 16) newErrors.nik = 'NIK must be 16 digits';
            
            if (!formData.pob) newErrors.pob = 'Place of Birth is required';
            if (!formData.dob) newErrors.dob = 'Date of Birth is required';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            setLoading(false);
            return;
        }

        const payload: Partial<User> & { password?: string } = {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            is_active: formData.is_active,
            is_activated: formData.is_activated,
            is_patient: formData.role === 'patient',
            is_doctor: formData.role === 'doctor',
            is_operator: formData.role === 'operator'
        };

        if (formData.role === 'patient') {
            payload.full_name = formData.full_name;
            payload.nik = formData.nik;
            payload.pob = formData.pob;
            payload.dob = formData.dob;
            payload.gender = formData.gender;
            payload.address = formData.address || undefined;
            payload.contact_number = formData.contact_number || undefined;
            payload.medical_history = formData.medical_history || undefined;
        }

        const result = await onSave(payload);
        
        if (result.success) {
            onClose();
        } else {
            const finalFieldErrors = { ...(result.fieldErrors || {}) };
            
            if (result.message) {
                const msg = result.message.toLowerCase();
                if (msg.includes('username') && !finalFieldErrors.username) {
                    finalFieldErrors.username = result.message;
                } else if (msg.includes('email') && !finalFieldErrors.email) {
                    finalFieldErrors.email = result.message;
                } else if (msg.includes('password') && !finalFieldErrors.password) {
                    finalFieldErrors.password = result.message;
                } else if (msg.includes('nik') && !finalFieldErrors.nik) {
                    finalFieldErrors.nik = result.message;
                } else if (Object.keys(finalFieldErrors).length === 0) {
                    setServerError(result.message);
                }
            }
            
            setErrors(finalFieldErrors);
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Create New User</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Add a new account to the system</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto custom-scrollbar" noValidate>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Account Credentials</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Username</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => handleFieldChange('username', e.target.value)}
                                    className={clsx(
                                        "w-full px-4 py-2.5 rounded-xl border outline-none text-sm font-semibold transition-all",
                                        errors.username ? "border-rose-300 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                    )}
                                    required
                                    placeholder="Unique username"
                                />
                                {errors.username && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1">{errors.username}</p>}
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Email Address</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleFieldChange('email', e.target.value)}
                                    className={clsx(
                                        "w-full px-4 py-2.5 rounded-xl border outline-none text-sm font-semibold transition-all",
                                        errors.email ? "border-rose-300 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                    )}
                                    required
                                    placeholder="user@example.com"
                                />
                                {errors.email && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1">{errors.email}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Password</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => handleFieldChange('password', e.target.value)}
                                    className={clsx(
                                        "w-full px-4 py-2.5 rounded-xl border outline-none text-sm font-semibold transition-all",
                                        errors.password ? "border-rose-300 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                    )}
                                    required
                                    placeholder="Secure password"
                                />
                                {errors.password && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1">{errors.password}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Access Level</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => handleFieldChange('role', e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-semibold text-slate-700 bg-white cursor-pointer"
                                >
                                    <option value="user">User (Standard Account)</option>
                                    <option value="patient">Patient</option>
                                    <option value="operator">Operator (Nurse / General Doctor)</option>
                                    <option value="doctor">Specialist (Doctor Specialist)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {formData.role === 'patient' && (
                        <div className="space-y-4 pt-2 border-t border-slate-50 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Personal Information</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Full Legal Name</label>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => handleFieldChange('full_name', e.target.value)}
                                        className={clsx(
                                            "w-full px-4 py-2.5 rounded-xl border outline-none text-sm font-semibold transition-all",
                                            errors.full_name ? "border-rose-300 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                        )}
                                        placeholder="Enter full name"
                                    />
                                    {errors.full_name && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1">{errors.full_name}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">NIK (16 Digits)</label>
                                    <input
                                        type="text"
                                        value={formData.nik}
                                        onChange={(e) => handleFieldChange('nik', e.target.value.replace(/\D/g, '').slice(0, 16))}
                                        className={clsx(
                                            "w-full px-4 py-2.5 rounded-xl border outline-none text-sm font-semibold transition-all font-mono",
                                            errors.nik ? "border-rose-300 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                        )}
                                        placeholder="16-digit ID number"
                                    />
                                    {errors.nik && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1">{errors.nik}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Place of Birth</label>
                                    <input
                                        type="text"
                                        value={formData.pob}
                                        onChange={(e) => handleFieldChange('pob', e.target.value)}
                                        className={clsx(
                                            "w-full px-4 py-2.5 rounded-xl border outline-none text-sm font-semibold transition-all",
                                            errors.pob ? "border-rose-300 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                        )}
                                        placeholder="City"
                                    />
                                    {errors.pob && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1">{errors.pob}</p>}
                                </div>
                                <div className="space-y-1">
                                    <FlatpickrInput 
                                        label="Date of Birth"
                                        value={formData.dob}
                                        onChange={(date) => handleFieldChange('dob', date)}
                                        errorMessage={errors.dob}
                                        placeholder="Select Date"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Gender</label>
                                    <select
                                        value={formData.gender}
                                        onChange={(e) => handleFieldChange('gender', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-semibold bg-white transition-all cursor-pointer"
                                    >
                                        <option value="L">Male</option>
                                        <option value="P">Female</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Contact Number</label>
                                    <input
                                        type="text"
                                        value={formData.contact_number}
                                        onChange={(e) => handleFieldChange('contact_number', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-semibold bg-white transition-all"
                                        placeholder="+62... (Optional)"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Residential Address</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => handleFieldChange('address', e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-semibold bg-white transition-all"
                                        placeholder="Street, City, Province (Optional)"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Medical History</label>
                                <select
                                    value={formData.medical_history}
                                    onChange={(e) => handleFieldChange('medical_history', e.target.value)}
                                    className={clsx(
                                        "w-full px-4 py-2.5 rounded-xl border outline-none text-sm font-semibold transition-all cursor-pointer bg-white",
                                        errors.medical_history ? "border-rose-300 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                    )}
                                >
                                    <option value="">Select Condition (Optional)</option>
                                    <option value="Normal">Normal</option>
                                    <option value="Hipertensi">Hipertensi</option>
                                    <option value="Penyakit Jantung">Penyakit Jantung</option>
                                </select>
                            </div>
                            
                            <div className="flex items-end pb-1 pt-2">
                                <label className="flex items-center justify-between w-full p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/30 hover:border-emerald-200 transition-colors cursor-pointer group">
                                    <div>
                                        <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wide ml-1 flex items-center gap-1.5">
                                            <CheckCircle2 size={14} /> Grant Full Access
                                        </span>
                                        <p className="text-[9px] text-emerald-600/70 font-medium ml-1 mt-0.5">Automatically verify and approve this account</p>
                                    </div>
                                    <div className={clsx("w-10 h-5 rounded-full relative transition-colors duration-200 shrink-0", formData.is_activated === 1 ? "bg-emerald-500" : "bg-slate-200")}>
                                        <input 
                                            type="checkbox" 
                                            className="sr-only" 
                                            checked={formData.is_activated === 1} 
                                            onChange={(e) => setFormData({ ...formData, is_activated: e.target.checked ? 1 : 0 })} 
                                        />
                                        <div className={clsx("absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-200 shadow-sm", formData.is_activated === 1 && "translate-x-5")} />
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="pt-2 space-y-3 sticky bottom-0 bg-white py-2">
                        {serverError && !Object.keys(errors).length && (
                            <p className="text-[10px] font-bold text-rose-500 text-center animate-in fade-in">{serverError}</p>
                        )}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <UserPlus size={16} /> Create User Account
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
