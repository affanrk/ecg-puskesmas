'use client';

import { CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';
import StandardInput from '@/components/shared/StandardInput';
import SelectInput from '@/components/shared/SelectInput';
import FlatpickrInput from '@/components/shared/FlatpickrInput';

interface UserFormFieldsProps {
    formData: {
        full_name: string;
        nik: string;
        pob: string;
        dob: string;
        gender: string;
        contact_number: string;
        address: string;
        medical_history?: string;
        is_activated?: number;
    };
    errors: Record<string, string>;
    handleFieldChange: (field: string, value: string | number | boolean) => void;
    showVerification?: boolean;
}

export function PatientIdentitySection({
    formData,
    errors,
    handleFieldChange,
    showVerification = true
}: UserFormFieldsProps) {
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StandardInput
                    label="Full Legal Name"
                    value={formData.full_name}
                    onChange={(e) => handleFieldChange('full_name', e.target.value)}
                    errorMessage={errors.full_name}
                    placeholder="Enter full name"
                />
                <StandardInput
                    label="NIK (16 Digits)"
                    value={formData.nik}
                    onChange={(e) => handleFieldChange('nik', e.target.value.replace(/\D/g, '').slice(0, 16))}
                    errorMessage={errors.nik}
                    placeholder="16-digit ID number"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StandardInput
                    label="Place of Birth"
                    value={formData.pob}
                    onChange={(e) => handleFieldChange('pob', e.target.value)}
                    errorMessage={errors.pob}
                    placeholder="City"
                />
                <FlatpickrInput
                    label="Date of Birth"
                    value={formData.dob}
                    onChange={(date) => handleFieldChange('dob', date)}
                    errorMessage={errors.dob}
                    placeholder="Select Date"
                />
                <SelectInput
                    label="Gender"
                    value={formData.gender}
                    onChange={(e) => handleFieldChange('gender', e.target.value)}
                    options={[
                        { value: 'L', label: 'Male' },
                        { value: 'P', label: 'Female' }
                    ]}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StandardInput
                    label="Contact Number"
                    value={formData.contact_number}
                    onChange={(e) => handleFieldChange('contact_number', e.target.value)}
                    errorMessage={errors.contact_number}
                    placeholder="+62... (Optional)"
                />
                <StandardInput
                    label="Residential Address"
                    value={formData.address}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    errorMessage={errors.address}
                    placeholder="Street, City, Province (Optional)"
                />
            </div>

            <SelectInput
                label="Medical History"
                value={formData.medical_history || ''}
                onChange={(e) => handleFieldChange('medical_history', e.target.value)}
                options={[
                    { value: '', label: 'Select Condition (Optional)' },
                    { value: 'Normal', label: 'Normal' },
                    { value: 'Hipertensi', label: 'Hipertensi' },
                    { value: 'Penyakit Jantung', label: 'Penyakit Jantung' }
                ]}
            />

            {showVerification && (
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
                                onChange={(e) => handleFieldChange('is_activated', e.target.checked ? 1 : 0)}
                            />
                            <div className={clsx("absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-200 shadow-sm", formData.is_activated === 1 && "translate-x-5")} />
                        </div>
                    </label>
                </div>
            )}
        </div>
    );
}
