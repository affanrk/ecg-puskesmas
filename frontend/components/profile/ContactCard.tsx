'use client';

import { Edit2, CheckCircle2, HeartPulse, Stethoscope } from 'lucide-react';
import StandardInput from '@/components/shared/StandardInput';
import SelectInput from '@/components/shared/SelectInput';
import clsx from 'clsx';

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

interface ContactCardProps {
    isLocked: boolean;
    isEditingMedical: boolean;
    setIsEditingMedical: (val: boolean) => void;
    medicalForm: MedicalForm;
    setMedicalForm: React.Dispatch<React.SetStateAction<MedicalForm>>; 
    handleMedicalChange: (field: string, value: string) => void;
    errors: Record<string, string>;
    handleCancelMedical: () => void;
    onSaveProfileClick: () => void;
    loading: boolean;
}

export default function ContactCard({
    isLocked,
    isEditingMedical,
    setIsEditingMedical,
    medicalForm,
    setMedicalForm,
    handleMedicalChange,
    errors,
    handleCancelMedical,
    onSaveProfileClick,
    loading
}: ContactCardProps) {
    const canEditMedical = !isLocked || isEditingMedical;

    return (
        <div className="bg-white p-6 lg:p-8 rounded-xl border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] flex flex-col h-full w-full transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] duration-500 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-teal-900 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <HeartPulse size={120} strokeWidth={1} />
            </div>

            <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-6 relative z-10">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-md flex items-center justify-center shadow-sm border border-teal-100/50">
                        <Stethoscope size={20} strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Clinical Details</h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Medical History & Contact</p>
                    </div>
                </div>

                {isLocked && !isEditingMedical && (
                    <button 
                        onClick={() => setIsEditingMedical(true)} 
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-teal-600 hover:bg-teal-50 px-4 py-2.5 rounded-md flex items-center gap-2 transition-all duration-300 border border-slate-100 hover:border-teal-200"
                    >
                        <Edit2 size={12} strokeWidth={3} /> Edit Info
                    </button>
                )}
            </div>

            <div className={clsx("space-y-6 flex-1 flex flex-col content-start relative z-10", !canEditMedical && "opacity-80")}>
                <SelectInput 
                    label="Medical History / Risk Factors" 
                    value={medicalForm.medical_history} 
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMedicalForm((p) => ({...p, medical_history: e.target.value}))} 
                    disabled={!canEditMedical}
                    options={[
                        { value: 'Normal', label: 'Normal (No Known Issues)' }, 
                        { value: 'Hipertensi', label: 'Hypertension (High Blood Pressure)' },
                        { value: 'Penyakit Jantung', label: 'Heart Disease (Cardiac History)' }
                    ]}
                />
                
                <StandardInput 
                    label="Phone Number" 
                    value={medicalForm.contact_number} 
                    onChange={(e) => handleMedicalChange('contact_number', e.target.value)} 
                    disabled={!canEditMedical} 
                    placeholder="+62..." 
                    errorMessage={errors.contact_number} 
                />
                
                <div className="flex-1">
                    <StandardInput 
                        label="Residential Address" 
                        value={medicalForm.address} 
                        onChange={(e) => handleMedicalChange('address', e.target.value)} 
                        disabled={!canEditMedical} 
                        placeholder="Street, City, Zip Code..." 
                    />
                </div>
            </div>

            {isLocked && isEditingMedical && (
                <div className="flex gap-4 pt-8 border-t border-slate-50 mt-8 shrink-0 relative z-10">
                    <button 
                        onClick={handleCancelMedical} 
                        className="flex-1 px-4 py-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-md transition-all active:scale-[0.98]"
                    >
                        Discard
                    </button>
                    <button 
                        onClick={onSaveProfileClick} 
                        disabled={loading} 
                        className="flex-2 px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase tracking-widest rounded-md shadow-xl shadow-teal-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 hover:-translate-y-0.5"
                    >
                        <CheckCircle2 size={18} strokeWidth={2.5} /> Save Updates
                    </button>
                </div>
            )}
        </div>
    );
}