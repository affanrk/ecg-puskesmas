'use client';

import { useState } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { ArrowRight, ArrowLeft, Loader2, HeartPulse, AlertTriangle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { api } from '@/services/api';
import { parseApiError } from '@/utils/helpers';
import FloatingNav from '@/components/shared/FloatingNav';
import { validators } from '@/utils/validators';
import { useToast } from '@/hooks/useToast';
import StandardInput from '@/components/shared/StandardInput';
import FlatpickrInput from '@/components/shared/FlatpickrInput';
import SelectInput from '@/components/shared/SelectInput';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import ReviewSummaryTable from '@/components/admin/users/parts/ReviewSummaryTable';

export default function DoctorOnboardingForm() {
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
        sip_number: '',
        specialty: '',
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
        if (field === 'sip_number') error = validators.required(value);
        if (field === 'specialty') error = validators.required(value);
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
        if (validators.required(formData.sip_number)) newErrors.sip_number = 'Required';
        if (validators.required(formData.specialty)) newErrors.specialty = 'Required';

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
            await api.createDoctorProfile(payload);
            const token = localStorage.getItem('ecg_token');
            if (token) {
                const fullProfile = await api.fetchUserProfile(token);
                localStorage.setItem('ecg_user', JSON.stringify(fullProfile));
                setUser(fullProfile);
            }
            toast("Doctor Profile created successfully!", "success");
            router.push('/doctor/dashboard');
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
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <FloatingNav
                backAction={{
                    label: 'Cancel & Return',
                    onClick: () => router.push('/onboarding')
                }}
            />

            <main className="flex-1 flex flex-col items-center justify-start py-8 md:py-12 p-4 md:p-6 relative z-10 min-h-0 overflow-y-auto custom-scrollbar">
                {/* Stepper Visual */}
                <div className="flex items-center gap-2 mb-6 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500 shrink-0">
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 font-bold items-center justify-center"><ArrowLeft size={12} /></div>
                    <div className="w-4 md:w-8 h-1 bg-brand-500 rounded-full mx-1" />
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 font-bold items-center justify-center"><ArrowLeft size={12} /></div>
                    <div className="w-4 md:w-8 h-1 bg-brand-500 rounded-full mx-1" />
                    <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-brand-600 text-white text-xs font-black shadow-sm shadow-brand-500/30">3</span>
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest shrink-0">Profile Completion</span>
                </div>

                <div className="bg-white w-full max-w-3xl rounded-2xl shadow-lg shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-500 delay-150 shrink-0">
                    <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex items-center gap-4 bg-emerald-50/30 shrink-0">
                        <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-md shadow-emerald-200 shrink-0">
                            <HeartPulse className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Heart Specialist Registration</h2>
                            <p className="text-xs md:text-sm font-medium text-slate-500 mt-0.5">Please provide your medical licensing & practice details</p>
                        </div>
                    </div>

                    <div className="bg-amber-50 border-b border-amber-100 px-6 md:px-8 py-3 flex items-start sm:items-center gap-3 shrink-0">
                        <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg shrink-0">
                            <AlertTriangle size={16} />
                        </div>
                        <p className="text-xs font-bold text-amber-800 leading-tight">
                            <span className="uppercase tracking-widest text-[10px] text-amber-600 block mb-0.5">Permanent Record Warning</span>
                            Name, NIK, Date of Birth, and Gender cannot be modified after submission. Match them exactly to your identification.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
                        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/60 space-y-4 focus-within:border-blue-300 focus-within:shadow-md focus-within:bg-white transition-all duration-300 group/section">
                            <h3 className="text-[10px] md:text-xs font-black text-slate-400 group-focus-within/section:text-blue-600 uppercase tracking-widest flex items-center gap-2 mb-2 transition-colors duration-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 group-focus-within/section:animate-pulse" /> Essential Identity
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

                        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/60 space-y-4 focus-within:border-emerald-300 focus-within:shadow-md focus-within:bg-white transition-all duration-300 group/section">
                            <h3 className="text-[10px] md:text-xs font-black text-slate-400 group-focus-within/section:text-emerald-600 uppercase tracking-widest flex items-center gap-2 mb-2 transition-colors duration-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-focus-within/section:animate-pulse" /> Medical Credentials & Practice
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                                <StandardInput label="STR Number" value={formData.str_number} onChange={(e) => handleFieldChange('str_number', e.target.value)} errorMessage={errors.str_number} placeholder="Surat Tanda Registrasi" />
                                <StandardInput label="SIP Number" value={formData.sip_number} onChange={(e) => handleFieldChange('sip_number', e.target.value)} errorMessage={errors.sip_number} placeholder="Surat Izin Praktik" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                                <SelectInput
                                    label="Medical Specialty"
                                    value={formData.specialty}
                                    onChange={(e) => handleFieldChange('specialty', e.target.value)}
                                    errorMessage={errors.specialty}
                                    options={[
                                        { value: '', label: 'Select Specialty' },
                                        { value: 'Sp.JP - Spesialis Jantung dan Pembuluh Darah', label: 'Sp.JP (Cardiologist)' },
                                        { value: 'Sp.PD - Spesialis Penyakit Dalam', label: 'Sp.PD (Internist)' }
                                    ]}
                                />
                                <StandardInput label="Primary Hospital Affiliation" value={formData.work_location} onChange={(e) => handleFieldChange('work_location', e.target.value)} errorMessage={errors.work_location} placeholder="Hospital Name" />
                            </div>
                        </div>

                        <div className="pt-5 mt-5 border-t border-slate-100 flex justify-end shrink-0 pb-2">
                            <button type="submit" disabled={loading} className="px-6 md:px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 cursor-pointer">
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
                            { field: 'STR Number', value: formData.str_number },
                            { field: 'SIP Number', value: formData.sip_number },
                            { field: 'Specialty', value: formData.specialty },
                            { field: 'Work Location', value: formData.work_location || '-' }
                        ]} />
                    </div>
                }
                confirmText="Submit & Activate Profile"
            />
        </div>
    );
}