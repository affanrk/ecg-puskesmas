'use client';

import { useState, useRef, useEffect } from 'react';
import { Edit2, CheckCircle2, HeartPulse, Stethoscope, ChevronDown } from 'lucide-react';
import StandardInput from '@/components/shared/StandardInput';
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
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const historyRef = useRef<HTMLDivElement>(null);
    const canEditMedical = !isLocked || isEditingMedical;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
                setIsHistoryOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="bg-white p-5 lg:p-6 flex flex-col w-full transition-all duration-500 relative group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-teal-900 pointer-events-none transition-transform duration-700">
                <HeartPulse size={100} strokeWidth={1} />
            </div>
            <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-5 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-md flex items-center justify-center shadow-sm border border-teal-100/50">
                        <Stethoscope size={18} strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-slate-800 tracking-tight">Clinical Details</h2>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-0.5">Medical History & Contact</p>
                    </div>
                </div>
                {isLocked && !isEditingMedical && (
                    <button 
                        onClick={() => setIsEditingMedical(true)} 
                        className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-teal-600 hover:bg-teal-50 px-3 py-2 rounded-md flex items-center gap-2 transition-all duration-300 border border-slate-100 hover:border-teal-200"
                    >
                        <Edit2 size={10} strokeWidth={3} /> Edit Info
                    </button>
                )}
            </div>
            <div className={clsx("space-y-5 flex-1 flex flex-col content-start relative z-10", !canEditMedical && "opacity-80")}>
                <div className="space-y-2 relative" ref={historyRef}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Medical History / Risk Factors</label>
                    <button
                        type="button"
                        disabled={!canEditMedical}
                        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                        className={clsx(
                            "w-full px-4 py-3 bg-white border rounded-md flex items-center justify-between transition-all group/btn",
                            isHistoryOpen ? "border-teal-500 shadow-lg shadow-teal-500/5" : "border-slate-200",
                            canEditMedical && !isHistoryOpen && "hover:border-teal-300",
                            !canEditMedical && "cursor-not-allowed opacity-100"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className={clsx(
                                "w-1.5 h-1.5 rounded-full transition-all",
                                medicalForm.medical_history ? "bg-teal-500 scale-125" : "bg-slate-200"
                            )} />
                            <span className={clsx(
                                "text-[11px] font-black uppercase tracking-wider",
                                medicalForm.medical_history ? "text-slate-700" : "text-slate-400"
                            )}>
                                {medicalForm.medical_history || "Select History"}
                            </span>
                        </div>
                        <ChevronDown size={14} className={clsx("text-slate-400 transition-transform duration-300", isHistoryOpen && "rotate-180")} strokeWidth={3} />
                    </button>
                    {isHistoryOpen && canEditMedical && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-md shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-200 origin-top">
                            {['Normal', 'Hipertensi', 'Penyakit Jantung'].map((option) => {
                                const isSelected = medicalForm.medical_history === option;
                                return (
                                    <button
                                        key={option}
                                        type="button"
                                        onClick={() => {
                                            setMedicalForm(p => ({ ...p, medical_history: option }));
                                            setIsHistoryOpen(false);
                                        }}
                                        className={clsx(
                                            "w-full px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-between group",
                                            isSelected ? "bg-teal-50 text-teal-700" : "text-slate-500 hover:bg-slate-50 hover:text-teal-600"
                                        )}
                                    >
                                        <span>{option}</span>
                                        {isSelected && <CheckCircle2 size={12} className="text-teal-600" strokeWidth={3} />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
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
            {isEditingMedical && (
                <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-50 mt-6 shrink-0 relative z-10">
                    <button 
                        onClick={handleCancelMedical} 
                        className="flex-1 px-3 py-3.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-md transition-all active:scale-[0.98]"
                    >
                        Discard
                    </button>
                    <button 
                        onClick={onSaveProfileClick} 
                        disabled={loading} 
                        className="flex-2 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-black uppercase tracking-widest rounded-md shadow-xl shadow-teal-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 hover:-translate-y-0.5"
                    >
                        <CheckCircle2 size={16} strokeWidth={2.5} /> Save Updates
                    </button>
                </div>
            )}
        </div>
    );
}
