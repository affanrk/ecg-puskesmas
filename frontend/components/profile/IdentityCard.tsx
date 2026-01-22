'use client';

import { User, Lock, Info, Save, CheckCircle2 } from 'lucide-react';
import StandardInput from '@/components/shared/StandardInput';
import FlatpickrInput from '@/components/shared/FlatpickrInput';
import SelectInput from '@/components/shared/SelectInput';

interface IdentityCardProps {
    isLocked: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    medicalForm: any;
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
        <div className="bg-white p-6 lg:p-8 rounded-xl border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] flex flex-col h-[480px] w-full transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <User size={18} />
                    </div>
                    <span>Patient Identity</span>
                </h2>
                {isLocked ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-100 shadow-sm">
                        <Lock size={10} /> VERIFIED
                    </span>
                ) : (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 flex items-center gap-1.5 shadow-sm">
                        <Info size={10} /> NOT VERIFIED
                    </span>
                )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <StandardInput label="Full Legal Name" value={medicalForm.full_name} onChange={(e: any) => handleMedicalChange('full_name', e.target.value)} disabled={isLocked} placeholder="e.g. John Doe" errorMessage={errors.full_name} />
                <StandardInput label="NIK (16 Digits)" value={medicalForm.nik} onChange={(e: any) => handleMedicalChange('nik', e.target.value.replace(/\D/g,''))} disabled={isLocked} placeholder="16-digit ID" errorMessage={errors.nik} />
                <StandardInput label="Place of Birth" value={medicalForm.pob} onChange={(e: any) => handleMedicalChange('pob', e.target.value)} disabled={isLocked} placeholder="City Name" errorMessage={errors.pob} />
                <FlatpickrInput label="Date of Birth" value={medicalForm.dob} onChange={(date) => handleMedicalChange('dob', date)} disabled={isLocked} placeholder="Select Date" errorMessage={errors.dob} />
                
                <div className="md:col-span-2">
                     <SelectInput 
                        label="Gender" 
                        value={medicalForm.gender} 
                        onChange={(e: any) => handleMedicalChange('gender', e.target.value)} 
                        disabled={isLocked}
                        options={[{ value: 'L', label: 'Male' }, { value: 'P', label: 'Female' }]}
                    />
                </div>
            </div>

            {!isLocked && (
                <div className="pt-4 mt-2 flex justify-end border-t border-slate-50">
                    <button 
                        onClick={onSaveProfileClick} 
                        disabled={loading} 
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-6 py-2.5 rounded-lg transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] flex items-center gap-2"
                    >
                        <Save size={14} /> Save Identity
                    </button>
                </div>
            )}
        </div>
    );
}
