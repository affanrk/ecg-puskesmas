'use client';

import { useState } from 'react';
import { User } from '@/store/useStore';
import { X, Save } from 'lucide-react';
import clsx from 'clsx';

interface EditUserModalProps {
    user: User;
    onClose: () => void;
    onSave: (userId: string, data: Partial<User>) => Promise<{ success: boolean, message?: string, fieldErrors?: Record<string, string> }>;
}

export default function EditUserModal({ user, onClose, onSave }: EditUserModalProps) {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [serverError, setServerError] = useState('');
    
    const getInitialRole = () => {
        if (user.is_doctor) return 'doctor';
        if (user.is_operator) return 'operator';
        if (user.is_patient) return 'patient';
        return 'user';
    };

    const [formData, setFormData] = useState({
        username: user.username || '',
        email: user.email || '',
        role: getInitialRole(),
        is_active: user.is_active,
        is_patient: user.is_patient,

        full_name: user.full_name || '',
        nik: user.nik || '',
        pob: user.pob || '',
        dob: user.dob || '',
        gender: user.gender || 'L',
        contact_number: user.contact_number || '',
        address: user.address || '',
        medical_history: user.medical_history || ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        setServerError('');
        
        const result = await onSave(user.id || '', formData);
        
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
                } else if (msg.includes('nik') && !finalFieldErrors.nik) {
                    finalFieldErrors.nik = result.message;
                } else if ((msg.includes('date of birth') || msg.includes('dob')) && !finalFieldErrors.dob) {
                    finalFieldErrors.dob = result.message;
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
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Edit User Account</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">User ID: {user.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
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
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className={clsx(
                                        "w-full px-4 py-2.5 rounded-xl border outline-none text-sm font-semibold transition-all",
                                        errors.username ? "border-rose-300 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                    )}
                                    required
                                />
                                {errors.username && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1">{errors.username}</p>}
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Email Address</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className={clsx(
                                        "w-full px-4 py-2.5 rounded-xl border outline-none text-sm font-semibold transition-all",
                                        errors.email ? "border-rose-300 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                    )}
                                    required
                                />
                                {errors.email && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1">{errors.email}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Access Level</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-semibold text-slate-700 bg-white cursor-pointer"
                                >
                                    <option value="user">User (Standard Account)</option>
                                    <option value="patient">Patient</option>
                                    <option value="operator">Operator (Nurse / General Doctor)</option>
                                    <option value="doctor">Specialist (Doctor Specialist)</option>
                                </select>
                            </div>
                            <div className="flex items-end pb-1">
                                <label className="flex items-center justify-between w-full p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors cursor-pointer group">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Account Active</span>
                                    <div className={clsx("w-10 h-5 rounded-full relative transition-colors duration-200 shrink-0", formData.is_active ? "bg-emerald-500" : "bg-slate-200")}>
                                        <input 
                                            type="checkbox" 
                                            className="sr-only" 
                                            checked={formData.is_active} 
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} 
                                        />
                                        <div className={clsx("absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-200 shadow-sm", formData.is_active && "translate-x-5")} />
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Patient Identity Details</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Full Legal Name</label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
                                    onChange={(e) => setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '').slice(0, 16) })}
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
                                    onChange={(e) => setFormData({ ...formData, pob: e.target.value })}
                                    className={clsx(
                                        "w-full px-4 py-2.5 rounded-xl border outline-none text-sm font-semibold transition-all",
                                        errors.pob ? "border-rose-300 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                    )}
                                    placeholder="City"
                                />
                                {errors.pob && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1">{errors.pob}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Date of Birth</label>
                                <input
                                    type="date"
                                    value={formData.dob}
                                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                    className={clsx(
                                        "w-full px-4 py-2.5 rounded-xl border outline-none text-sm font-semibold transition-all",
                                        errors.dob ? "border-rose-300 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                    )}
                                />
                                {errors.dob && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1">{errors.dob}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Gender</label>
                                <select
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    className={clsx(
                                        "w-full px-4 py-2.5 rounded-xl border outline-none text-sm font-semibold transition-all cursor-pointer",
                                        errors.gender ? "border-rose-300 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                    )}
                                >
                                    <option value="L">Male</option>
                                    <option value="P">Female</option>
                                </select>
                                {errors.gender && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1">{errors.gender}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Contact Number</label>
                                <input
                                    type="text"
                                    value={formData.contact_number}
                                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                                    className={clsx(
                                        "w-full px-4 py-2.5 rounded-xl border outline-none text-sm font-semibold transition-all",
                                        errors.contact_number ? "border-rose-300 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                    )}
                                    placeholder="+62... (Optional)"
                                />
                                {errors.contact_number && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1">{errors.contact_number}</p>}
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Residential Address</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className={clsx(
                                        "w-full px-4 py-2.5 rounded-xl border outline-none text-sm font-semibold transition-all",
                                        errors.address ? "border-rose-300 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                    )}
                                    placeholder="Street, City, Province (Optional)"
                                />
                                {errors.address && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1">{errors.address}</p>}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide ml-1">Medical History</label>
                            <textarea
                                value={formData.medical_history}
                                onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
                                className={clsx(
                                    "w-full px-4 py-3 rounded-xl border outline-none text-sm font-semibold transition-all min-h-[80px] resize-none",
                                    errors.medical_history ? "border-rose-300 focus:ring-rose-500/10 focus:border-rose-500 bg-rose-50/30" : "border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white"
                                )}
                                placeholder="Prior conditions, allergies, etc."
                            />
                            {errors.medical_history && <p className="text-[9px] font-bold text-rose-500 ml-1 mt-1">{errors.medical_history}</p>}
                        </div>
                    </div>

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
                                    <Save size={16} /> Update Account & Profile
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
