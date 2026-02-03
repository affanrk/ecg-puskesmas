'use client';

import { User, Info, Save, BadgeCheck, Fingerprint } from 'lucide-react';
import StandardInput from '@/components/shared/StandardInput';
import FlatpickrInput from '@/components/shared/FlatpickrInput';
import SelectInput from '@/components/shared/SelectInput';

interface MedicalForm {
    full_name: string;
    nik: string;
    pob: string;
    dob: string;
    gender: string;
    contact_number: string;
    address: string;
    medical_history: string;
}

interface IdentityCardProps {
    isLocked: boolean;
    medicalForm: MedicalForm;
    handleMedicalChange: (field: string, value: string) => void;
    errors: Record<string, string>;
    onSaveProfileClick: () => void;
    loading: boolean;
}

export default function IdentityCard({
    isLocked,
    medicalForm,
    handleMedicalChange,
    errors,
    onSaveProfileClick,
    loading
}: IdentityCardProps) {
    return (
        <div className="bg-white p-6 lg:p-8 rounded-xl border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] flex flex-col h-full w-full transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] duration-500 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-slate-900 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <Fingerprint size={120} strokeWidth={1} />
            </div>

            <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-6 relative z-10">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-md flex items-center justify-center shadow-sm border border-blue-100/50">
                        <User size={20} strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Patient Identity</h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Demographics & Verification</p>
                    </div>
                </div>
                
                {isLocked ? (
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-md flex items-center gap-1.5 border border-emerald-100 shadow-sm uppercase tracking-wider">
                            <BadgeCheck size={14} strokeWidth={3} /> Verified
                        </span>
                    </div>
                ) : (
                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-100 flex items-center gap-1.5 shadow-sm uppercase tracking-wider animate-pulse">
                        <Info size={14} strokeWidth={3} /> Pending Activation
                    </span>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 flex-1 content-start relative z-10">
                <div className="space-y-1.5">
                    <StandardInput 
                        label="Full Legal Name" 
                        value={medicalForm.full_name} 
                        onChange={(e) => handleMedicalChange('full_name', e.target.value)} 
                        disabled={isLocked} 
                        placeholder="e.g. John Doe" 
                        errorMessage={errors.full_name} 
                    />
                </div>
                <div className="space-y-1.5">
                    <StandardInput 
                        label="NIK (16 Digits)" 
                        value={medicalForm.nik} 
                        onChange={(e) => handleMedicalChange('nik', e.target.value.replace(/\D/g,''))} 
                        disabled={isLocked} 
                        placeholder="16-digit ID number" 
                        errorMessage={errors.nik} 
                    />
                </div>
                <div className="space-y-1.5">
                    <StandardInput 
                        label="Place of Birth" 
                        value={medicalForm.pob} 
                        onChange={(e) => handleMedicalChange('pob', e.target.value)} 
                        disabled={isLocked} 
                        placeholder="City" 
                        errorMessage={errors.pob} 
                    />
                </div>
                <div className="space-y-1.5">
                    <FlatpickrInput 
                        label="Date of Birth" 
                        value={medicalForm.dob} 
                        onChange={(date) => handleMedicalChange('dob', date)} 
                        disabled={isLocked} 
                        placeholder="Select Date" 
                        errorMessage={errors.dob} 
                    />
                </div>
                
                <div className="md:col-span-2 space-y-1.5">
                     <SelectInput 
                        label="Gender" 
                        value={medicalForm.gender} 
                        onChange={(e) => handleMedicalChange('gender', e.target.value)} 
                        disabled={isLocked}
                        options={[{ value: 'L', label: 'Male' }, { value: 'P', label: 'Female' }]}
                    />
                </div>
            </div>

            {!isLocked && (
                <div className="pt-8 mt-8 flex justify-end border-t border-slate-50 relative z-10">
                    <button 
                        onClick={onSaveProfileClick} 
                        disabled={loading} 
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-[0.15em] px-10 py-4 rounded-md transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] flex items-center gap-3 group/btn overflow-hidden relative"
                    >
                        <Save size={18} strokeWidth={2.5} className="relative z-10" />
                        <span className="relative z-10">Activate Profile</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                    </button>
                </div>
            )}
        </div>
    );
}
