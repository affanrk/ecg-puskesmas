'use client';

import { User, Info, Save, BadgeCheck, Fingerprint } from 'lucide-react';

import FlatpickrInput from '@/components/shared/FlatpickrInput';
import SelectInput from '@/components/shared/SelectInput';
import StandardInput from '@/components/shared/StandardInput';
import { genderOptions } from '@/data';
import { useStore } from '@/store/useStore';
import { MedicalFormFields } from '@/types/user';

interface SharedIdentityCardProps {
    isLocked: boolean;
    isActivated: boolean;
    rejectionReason: string | null;
    medicalForm: MedicalFormFields;
    handleMedicalChange: (field: string, value: string) => void;
    errors: Record<string, string>;
    onSaveProfileClick: () => void;
    loading: boolean;
}

export default function SharedIdentityCard({
    isLocked,
    isActivated,
    rejectionReason,
    medicalForm,
    handleMedicalChange,
    errors,
    onSaveProfileClick,
    loading
}: SharedIdentityCardProps) {
    const user = useStore(state => state.user);
    const roleTitle = user?.is_doctor ? "Doctor Specialist" : user?.is_operator ? "Medical Staff Identity" : "Patient Identity";

    return (
        <div className="bg-white p-5 lg:p-6 flex flex-col w-full transition-all duration-500 relative group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-slate-900 pointer-events-none transition-transform duration-700">
                <Fingerprint size={100} strokeWidth={1} />
            </div>
            <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-5 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-md flex items-center justify-center shadow-sm border border-blue-100/50">
                        <User size={18} strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-slate-800 tracking-tight">{roleTitle}</h2>
                        <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-0.5">Demographics & Verification</p>
                    </div>
                </div>
                {isActivated ? (
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-emerald-100 shadow-sm uppercase tracking-wider">
                            <BadgeCheck size={12} strokeWidth={3} /> Verified
                        </span>
                    </div>
                ) : (
                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-100 flex items-center gap-1.5 shadow-sm uppercase tracking-wider animate-pulse">
                        <Info size={12} strokeWidth={3} /> {isLocked ? "Awaiting Activation" : "Pending Activation"}
                    </span>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 flex-1 content-start relative z-10">
                <div className="space-y-1">
                    <StandardInput 
                        label="Full Legal Name" 
                        value={medicalForm.full_name} 
                        onChange={(e) => handleMedicalChange('full_name', e.target.value)} 
                        disabled={isLocked} 
                        placeholder="e.g. John Doe" 
                        errorMessage={errors.full_name} 
                    />
                </div>
                <div className="space-y-1">
                    <StandardInput 
                        label="NIK (16 Digits)" 
                        value={medicalForm.nik} 
                        onChange={(e) => handleMedicalChange('nik', e.target.value.replace(/\D/g,'').slice(0, 16))} 
                        disabled={isLocked} 
                        placeholder="16-digit ID number" 
                        errorMessage={errors.nik} 
                    />
                </div>
                <div className="space-y-1">
                    <StandardInput 
                        label="Place of Birth" 
                        value={medicalForm.pob} 
                        onChange={(e) => handleMedicalChange('pob', e.target.value)} 
                        disabled={isLocked} 
                        placeholder="City" 
                        errorMessage={errors.pob} 
                    />
                </div>
                <div className="space-y-1">
                    <FlatpickrInput 
                        label="Date of Birth" 
                        value={medicalForm.dob} 
                        onChange={(date) => handleMedicalChange('dob', date)} 
                        disabled={isLocked} 
                        placeholder="Select Date" 
                        errorMessage={errors.dob} 
                    />
                </div>
                <div className="space-y-1">
                     <SelectInput 
                        label="Gender" 
                        value={medicalForm.gender} 
                        onChange={(e) => handleMedicalChange('gender', e.target.value)} 
                        disabled={isLocked}
                        options={genderOptions}
                    />
                </div>
                {(user?.is_operator || user?.is_doctor) && (
                    <div className="space-y-1">
                        <StandardInput 
                            label="STR Number" 
                            value={medicalForm.str_number} 
                            onChange={(e) => handleMedicalChange('str_number', e.target.value)} 
                            disabled={isLocked} 
                            placeholder="Surat Tanda Registrasi" 
                            errorMessage={errors.str_number} 
                        />
                    </div>
                )}
                {user?.is_doctor && (
                    <div className="space-y-1">
                        <StandardInput 
                            label="SIP Number" 
                            value={medicalForm.sip_number} 
                            onChange={(e) => handleMedicalChange('sip_number', e.target.value)} 
                            disabled={isLocked} 
                            placeholder="Surat Izin Praktik" 
                            errorMessage={errors.sip_number} 
                        />
                    </div>
                )}
            </div>
            {!isLocked && (
                <div className="pt-6 mt-6 flex justify-end border-t border-slate-50 relative z-10">
                    <button 
                        onClick={onSaveProfileClick} 
                        disabled={loading} 
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-[0.15em] px-8 py-3.5 rounded-md transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-3 group/btn overflow-hidden relative cursor-pointer"
                    >
                        {loading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10"></span>
                                <span className="relative z-10">Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} strokeWidth={2.5} className="relative z-10" />
                                <span className="relative z-10">{rejectionReason ? "Update & Reactivate" : "Activate Profile"}</span>
                            </>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                    </button>
                </div>
            )}
        </div>
    );
}
