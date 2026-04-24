'use client';

import { LocationResponse } from '@/types/user';
import { X } from 'lucide-react';
import StandardInput from '@/components/shared/StandardInput';
import SelectInput from '@/components/shared/SelectInput';
import FlatpickrInput from '@/components/shared/FlatpickrInput';
import { genderOptions } from '@/data';

interface AdminFormData {
    username: string;
    email: string;
    password: string;
    full_name: string;
    nik: string;
    pob: string;
    dob: string;
    gender: string;
    address: string;
    contact_number: string;
    location_id: string;
}

interface AdminFormModalProps {
    mode: 'create' | 'reassign';
    formData: AdminFormData;
    errors: Record<string, string>;
    locations: LocationResponse[];
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onFieldChange: (field: string, value: string) => void;
}

export default function AdminFormModal({
    mode,
    formData,
    errors,
    locations,
    isSubmitting,
    onClose,
    onSubmit,
    onFieldChange
}: AdminFormModalProps) {
    const activeLocations = locations
        .filter(loc => loc.is_active)
        .sort((a, b) => a.name.localeCompare(b.name));

    const hasActiveLocations = activeLocations.length > 0;

    const locationOptions = hasActiveLocations
        ? [
            { value: '', label: 'Select Location...' },
            ...activeLocations.map(l => ({ value: l.id, label: l.name }))
        ]
        : [{ value: 'no-locations', label: 'No active locations available' }];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <h3 className="text-lg font-black text-slate-800 tracking-tight">
                        {mode === 'create' ? 'Register Admin User' : 'Reassign Admin Location'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={onSubmit} noValidate className="p-6 space-y-6 overflow-y-auto flex-1">
                    {mode === 'create' && (
                        <>
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Account Credentials
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <StandardInput
                                        label="Username" required
                                        value={formData.username}
                                        onChange={(e) => onFieldChange('username', e.target.value)}
                                        placeholder="e.g. jdoe"
                                        errorMessage={errors.username}
                                    />
                                    <StandardInput
                                        label="Email" required type="email"
                                        value={formData.email}
                                        onChange={(e) => onFieldChange('email', e.target.value)}
                                        placeholder="e.g. user@puskesmas.id"
                                        errorMessage={errors.email}
                                    />
                                </div>
                                <StandardInput
                                    label="Password (Optional - defaults to 'admin1234')" type="password"
                                    value={formData.password}
                                    onChange={(e) => onFieldChange('password', e.target.value)}
                                    placeholder="Leave empty for default password"
                                    errorMessage={errors.password}
                                />
                            </div>

                            <div className="space-y-4 pt-2 border-t border-slate-50">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-500" /> Personal Information
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <StandardInput
                                        label="Full Name" required
                                        value={formData.full_name}
                                        onChange={(e) => onFieldChange('full_name', e.target.value)}
                                        placeholder="e.g. Dr. John Doe"
                                        errorMessage={errors.full_name}
                                    />
                                    <StandardInput
                                        label="NIK (16 Digits)" required
                                        value={formData.nik}
                                        onChange={(e) => onFieldChange('nik', e.target.value)}
                                        placeholder="e.g. 3201234567890123"
                                        maxLength={16}
                                        errorMessage={errors.nik}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <StandardInput
                                        label="Place of Birth" required
                                        value={formData.pob}
                                        onChange={(e) => onFieldChange('pob', e.target.value)}
                                        placeholder="e.g. Jakarta"
                                        errorMessage={errors.pob}
                                    />
                                    <FlatpickrInput
                                        label="Date of Birth" required
                                        value={formData.dob}
                                        onChange={(date) => onFieldChange('dob', date)}
                                        placeholder="Select date"
                                        errorMessage={errors.dob}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <SelectInput
                                        label="Gender" required
                                        value={formData.gender}
                                        onChange={(e) => onFieldChange('gender', e.target.value)}
                                        options={[
                                            { value: '', label: 'Select Gender...' },
                                            ...genderOptions
                                        ]}
                                        errorMessage={errors.gender}
                                    />
                                    <StandardInput
                                        label="Contact Number"
                                        value={formData.contact_number}
                                        onChange={(e) => onFieldChange('contact_number', e.target.value)}
                                        placeholder="e.g. 081234567890"
                                        errorMessage={errors.contact_number}
                                    />
                                </div>
                                <StandardInput
                                    label="Address"
                                    value={formData.address}
                                    onChange={(e) => onFieldChange('address', e.target.value)}
                                    placeholder="e.g. Jl. Merdeka No. 123"
                                    errorMessage={errors.address}
                                />
                            </div>
                        </>
                    )}

                    <div className={mode === 'create' ? 'pt-2 border-t border-slate-50' : ''}>
                        {mode === 'create' && (
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Location Assignment
                            </h4>
                        )}
                        <SelectInput
                            label="Target Location"
                            required
                            value={formData.location_id}
                            onChange={(e) => onFieldChange('location_id', e.target.value)}
                            options={locationOptions}
                            errorMessage={errors.location_id}
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin cursor-not-allowed" />
                                    Processing...
                                </>
                            ) : (
                                mode === 'create' ? 'Review & Create' : 'Reassign'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
