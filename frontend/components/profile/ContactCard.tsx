'use client';

import { Activity, Edit2, CheckCircle2 } from 'lucide-react';
import StandardInput from '@/components/shared/StandardInput';
import SelectInput from '@/components/shared/SelectInput';
import clsx from 'clsx';

interface ContactCardProps {
    isLocked: boolean;
    isEditingMedical: boolean;
    setIsEditingMedical: (val: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    medicalForm: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setMedicalForm: (val: any) => void; 
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
    // 1. Computed
    const canEditMedical = !isLocked || isEditingMedical;

    // 2. Render
    return (
        <div className="bg-white p-6 lg:p-8 rounded-xl border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] flex flex-col h-[480px] w-full transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Activity size={18} />
                    </div>
                    <span>Medical Info</span>
                </h2>
                {isLocked && !isEditingMedical && (
                    <button 
                        onClick={() => setIsEditingMedical(true)} 
                        className="text-xs font-semibold text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200"
                    >
                        <Edit2 size={14} /> Edit
                    </button>
                )}
                {isLocked && isEditingMedical && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full shadow-sm ring-1 ring-emerald-100 flex items-center gap-1">
                        <Edit2 size={10} /> EDITING
                    </span>
                )}
            </div>

            <div className={clsx("space-y-4 flex-1 flex flex-col", !canEditMedical && "opacity-90")}>
                <SelectInput 
                    label="Medical History" 
                    value={medicalForm.medical_history} 
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onChange={(e: any) => setMedicalForm((p: any) => ({...p, medical_history: e.target.value}))} 
                    disabled={!canEditMedical}
                    options={[
                        { value: 'Normal', label: 'Normal' }, 
                        { value: 'Hipertensi', label: 'Hipertensi' },
                        { value: 'Penyakit Jantung', label: 'Heart Disease' }
                    ]}
                />
                
                <StandardInput label="Phone Number" value={medicalForm.contact_number} onChange={(e) => handleMedicalChange('contact_number', e.target.value)} disabled={!canEditMedical} placeholder="+62..." errorMessage={errors.contact_number} />
                
                <div className="flex-1">
                    <StandardInput label="Home Address" value={medicalForm.address} onChange={(e) => handleMedicalChange('address', e.target.value)} disabled={!canEditMedical} placeholder="Street, City..." />
                </div>
            </div>

            {isLocked && isEditingMedical && (
                <div className="flex gap-3 pt-3 border-t border-slate-50 mt-3 shrink-0">
                    <button 
                        onClick={handleCancelMedical} 
                        className="flex-1 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onSaveProfileClick} 
                        disabled={loading} 
                        className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-emerald-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 size={14} /> Save
                    </button>
                </div>
            )}
        </div>
    );
}
