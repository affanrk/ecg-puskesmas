'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowRight, ArrowLeft, Loader2, Stethoscope } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { api } from '@/services/api';
import { parseApiError } from '@/utils/helpers';
import { validators } from '@/utils/validators';
import { useToast } from '@/hooks/useToast';
import StandardInput from '@/components/shared/StandardInput';
import FlatpickrInput from '@/components/shared/FlatpickrInput';
import SelectInput from '@/components/shared/SelectInput';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import ReviewSummaryTable from '@/components/admin/users/parts/ReviewSummaryTable';

export default function OperatorOnboardingForm() {
    const router = useRouter();
    const { user, setUser } = useStore();
    const { show: toast } = useToast();
    
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    
    const [formData, setFormData] = useState({
        full_name: '',
        nik: '',
        pob: '',
        dob: '',
        gender: '',
        contact_number: '',
        address: '',
        str_number: '',
        operator_role: '',
        work_location: '',
        source: 'WEB'
    });

    if (!user) return null;

    const handleFieldChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        let error = '';
        if (field === 'full_name') error = validators.name(value);
        if (field === 'nik') error = validators.nik(value);
        if (field === 'pob') error = validators.required(value);
        if (field === 'dob') error = validators.dob(value);
        if (field === 'gender') error = validators.required(value);
        if (field === 'str_number') error = validators.required(value);
        if (field === 'operator_role') error = validators.required(value);
        if (field === 'contact_number') error = validators.phone(value);

        setErrors(prev => ({ ...prev, [field]: error }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};
        
        const nameErr = validators.name(formData.full_name);
        if (nameErr) newErrors.full_name = nameErr;

        const nikErr = validators.nik(formData.nik);
        if (nikErr) newErrors.nik = nikErr;

        if (validators.required(formData.pob)) newErrors.pob = 'Required';
        
        const dobErr = validators.dob(formData.dob);
        if (dobErr) newErrors.dob = dobErr;
        
        if (validators.required(formData.gender)) newErrors.gender = 'Required';
        if (validators.required(formData.str_number)) newErrors.str_number = 'Required';
        if (validators.required(formData.operator_role)) newErrors.operator_role = 'Required';

        const phoneErr = validators.phone(formData.contact_number);
        if (phoneErr) newErrors.contact_number = phoneErr;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsConfirmOpen(true);
    };

    const executeSubmit = async () => {
        setIsConfirmOpen(false);
        setLoading(true);
        try {
            const payload = {
                ...formData,
                contact_number: formData.contact_number || null,
                address: formData.address || null,
                work_location: formData.work_location || null
            };
            await api.createOperatorProfile(payload);
            const token = localStorage.getItem('ecg_token');
            if (token) {
                const fullProfile = await api.fetchUserProfile(token);
                localStorage.setItem('ecg_user', JSON.stringify(fullProfile));
                setUser(fullProfile);
            }
            toast("Profile created successfully!", "success");
            router.push('/operator/dashboard');
        } catch (err) {
            const { message, fieldErrors } = parseApiError(err as Error);
            if (Object.keys(fieldErrors).length > 0) {
                setErrors(prev => ({ ...prev, ...fieldErrors }));
            } else {
                toast(message || "An unexpected error occurred.", "error");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen bg-slate-50 flex flex-col relative overflow-hidden font-sans">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-brand-900/5 pointer-events-none"></div>
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-400/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <header className="px-6 md:px-8 py-4 relative z-10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/20">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-black text-xl text-slate-900 tracking-tight">ECG Platform</span>
                </div>
                <button onClick={() => router.push('/onboarding')} className="group flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors bg-white/60 backdrop-blur-md px-4 py-2.5 rounded-full border border-slate-200/60 shadow-sm hover:shadow-md cursor-pointer">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Cancel & Return
                </button>
            </header>

            <main className="flex-1 flex items-center justify-center p-4 md:p-6 relative z-10 min-h-0">
                <div className="bg-white w-full max-w-3xl max-h-full rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-500">
                    <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex items-center gap-4 bg-amber-50/30 shrink-0">
                        <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-md shadow-amber-200 shrink-0">
                            <Stethoscope className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Medical Staff Registration</h2>
                            <p className="text-xs md:text-sm font-medium text-slate-500 mt-0.5">Please provide your official professional details</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5 overflow-y-auto custom-scrollbar">
                        <div className="space-y-3 md:space-y-4">
                            <h3 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Essential Identity
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                                <StandardInput label="Full Legal Name" value={formData.full_name} onChange={(e) => handleFieldChange('full_name', e.target.value)} errorMessage={errors.full_name} placeholder="Enter your full name as on ID" />
                                <StandardInput label="NIK (16 Digits)" value={formData.nik} onChange={(e) => handleFieldChange('nik', e.target.value.replace(/\D/g, '').slice(0, 16))} errorMessage={errors.nik} placeholder="16-digit ID number" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                                <StandardInput label="Place of Birth" value={formData.pob} onChange={(e) => handleFieldChange('pob', e.target.value)} errorMessage={errors.pob} placeholder="City" />
                                <FlatpickrInput label="Date of Birth" value={formData.dob} onChange={(date) => handleFieldChange('dob', date)} errorMessage={errors.dob} placeholder="Select Date" />
                                <SelectInput label="Gender" value={formData.gender} onChange={(e) => handleFieldChange('gender', e.target.value)} errorMessage={errors.gender} options={[{ value: '', label: 'Select Gender' }, { value: 'L', label: 'Male' }, { value: 'P', label: 'Female' }]} />
                            </div>
                        </div>

                        <div className="space-y-3 md:space-y-4 pt-4 border-t border-slate-50">
                            <h3 className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Contact & Professional Context
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                                <StandardInput label="Contact Number" value={formData.contact_number} onChange={(e) => handleFieldChange('contact_number', e.target.value)} errorMessage={errors.contact_number} placeholder="+62... (Optional)" />
                                <StandardInput label="Residential Address" value={formData.address} onChange={(e) => handleFieldChange('address', e.target.value)} errorMessage={errors.address} placeholder="Street, City, Province (Optional)" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                                <SelectInput 
                                    label="Professional Role" 
                                    value={formData.operator_role} 
                                    onChange={(e) => handleFieldChange('operator_role', e.target.value)} 
                                    errorMessage={errors.operator_role}
                                    options={[
                                        { value: '', label: 'Select Role' }, 
                                        { value: 'Nurse', label: 'Nurse' }, 
                                        { value: 'Dokter Umum', label: 'General Practitioner' }
                                    ]} 
                                />
                                <StandardInput label="STR Number" value={formData.str_number} onChange={(e) => handleFieldChange('str_number', e.target.value)} errorMessage={errors.str_number} placeholder="Surat Tanda Registrasi" />
                                <StandardInput label="Work Location" value={formData.work_location} onChange={(e) => handleFieldChange('work_location', e.target.value)} errorMessage={errors.work_location} placeholder="Clinic Name" />
                            </div>
                        </div>

                        <div className="pt-5 mt-5 border-t border-slate-100 flex justify-end shrink-0 pb-2">
                            <button type="submit" disabled={loading} className="px-6 md:px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Complete Registration <ArrowRight size={18} /></>}
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={executeSubmit}
                title="Review Registration Information"
                message={
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500 font-medium">
                            WARNING: Once saved, your <span className="font-bold text-rose-600">Name, NIK, Date of Birth, and Gender</span> will be <span className="font-bold text-rose-600">PERMANENTLY locked</span>. They cannot be changed after submission. Please ensure they match your official ID exactly.
                        </p>
                        <ReviewSummaryTable data={[
                            { field: 'Full Name', value: formData.full_name },
                            { field: 'NIK', value: formData.nik },
                            { field: 'Place of Birth', value: formData.pob },
                            { field: 'Date of Birth', value: formData.dob },
                            { field: 'Gender', value: formData.gender === 'L' ? 'Male' : 'Female' },
                            { field: 'Role', value: formData.operator_role },
                            { field: 'STR Number', value: formData.str_number },
                            { field: 'Work Location', value: formData.work_location || '-' }
                        ]} />
                    </div>
                }
                confirmText="Submit & Activate Profile"
            />
        </div>
    );
}