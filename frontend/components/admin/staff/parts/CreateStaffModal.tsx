'use client';

import { AlertTriangle, UserPlus } from 'lucide-react';
import { X } from 'lucide-react';
import clsx from 'clsx';

import FlatpickrInput from '@/components/shared/FlatpickrInput';
import SelectInput from '@/components/shared/SelectInput';
import StandardInput from '@/components/shared/StandardInput';
import { genderOptions, operatorRoleOptions, doctorSpecialtyOptions } from '@/data';
import { useDuplicateCheck } from '@/hooks/useDuplicateCheck';
import { LocationResponse, StaffFormData } from '@/types/user';

interface CreateStaffModalProps {
    formData: StaffFormData;
    errors: Record<string, string>;
    adminLocation: LocationResponse | null;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    onFieldChange: (field: string, value: string) => void;
    onAddExistingStaff?: (userId: string) => void;
}

export default function CreateStaffModal({
    formData,
    errors,
    adminLocation,
    isSubmitting,
    onClose,
    onSubmit,
    onFieldChange,
    onAddExistingStaff
}: CreateStaffModalProps) {
    const { hasNikDuplicate, hasEmailDuplicate, existingStaff } = useDuplicateCheck({
        nik: formData.nik,
        email: formData.email,
        debounceMs: 500
    });

    const showDuplicateWarning = (hasNikDuplicate || hasEmailDuplicate) && existingStaff;

    const roleOptions = [
        { value: '', label: 'Select Role...' },
        { value: 'operator', label: 'Operator' },
        { value: 'doctor', label: 'Doctor' }
    ];

    const operatorRoleSelectOptions = [
        { value: '', label: 'Select Operator Role...' },
        ...operatorRoleOptions
    ];

    const doctorSpecialtySelectOptions = [
        { value: '', label: 'Select Specialty...' },
        ...doctorSpecialtyOptions
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">
                            Register Staff Member
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 border border-rose-100 hover:border-rose-200 transition-all cursor-pointer">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={onSubmit} noValidate className="p-6 space-y-6 overflow-y-auto flex-1">
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Account Credentials
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
                                placeholder="e.g. staff@puskesmas.id"
                                errorMessage={errors.email}
                            />
                        </div>
                        <StandardInput
                            label="Password (Optional)" type="password"
                            value={formData.password}
                            onChange={(e) => onFieldChange('password', e.target.value)}
                            placeholder="Leave empty for auto-generated password"
                            errorMessage={errors.password}
                        />
                    </div>

                    <div className="space-y-4 pt-2 border-t border-slate-50">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Personal Information
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

                        {showDuplicateWarning && existingStaff && (
                            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-amber-100 rounded-lg shrink-0">
                                        <AlertTriangle size={20} className="text-amber-600" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <h5 className="font-black text-sm text-amber-900">
                                            {hasNikDuplicate && hasEmailDuplicate ? 'NIK and Email Already Registered' : hasNikDuplicate ? 'NIK Already Registered' : 'Email Already Registered'}
                                        </h5>
                                        <div className="text-sm text-amber-800 space-y-1">
                                            <p className="font-semibold">{existingStaff.full_name}</p>
                                            <p className="text-xs">
                                                <span className="font-bold">Role:</span> {existingStaff.role === 'doctor' ? 'Doctor' : 'Operator'}
                                                {existingStaff.primary_location && (
                                                    <> • <span className="font-bold">Primary Location:</span> {existingStaff.primary_location}</>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (onAddExistingStaff) {
                                                        onAddExistingStaff(existingStaff.user_id);
                                                    }
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-sm transition-all shadow-sm"
                                            >
                                                <UserPlus size={16} />
                                                Add to My Location
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="px-4 py-2 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-lg font-bold text-sm transition-all"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
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

                    <div className="space-y-4 pt-2 border-t border-slate-50">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Professional Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SelectInput
                                label="Role" required
                                value={formData.role}
                                onChange={(e) => onFieldChange('role', e.target.value)}
                                options={roleOptions}
                                errorMessage={errors.role}
                            />
                            <StandardInput
                                label="STR Number" required
                                value={formData.str_number}
                                onChange={(e) => onFieldChange('str_number', e.target.value)}
                                placeholder="e.g. 1234567890"
                                errorMessage={errors.str_number}
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FlatpickrInput
                                label="STR Expiry Date"
                                value={formData.str_expiry_date}
                                onChange={(date) => onFieldChange('str_expiry_date', date)}
                                placeholder="Select expiry date"
                                errorMessage={errors.str_expiry_date}
                            />
                        </div>
                        
                        {formData.role === 'doctor' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <SelectInput
                                        label="Specialty" required
                                        value={formData.specialty}
                                        onChange={(e) => onFieldChange('specialty', e.target.value)}
                                        options={doctorSpecialtySelectOptions}
                                        errorMessage={errors.specialty}
                                    />
                                    <StandardInput
                                        label="SIP Number" required
                                        value={formData.sip_number}
                                        onChange={(e) => onFieldChange('sip_number', e.target.value)}
                                        placeholder="e.g. SIP/123/2024"
                                        errorMessage={errors.sip_number}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FlatpickrInput
                                        label="SIP Expiry Date"
                                        value={formData.sip_expiry_date}
                                        onChange={(date) => onFieldChange('sip_expiry_date', date)}
                                        placeholder="Select expiry date"
                                        errorMessage={errors.sip_expiry_date}
                                    />
                                </div>
                            </>
                        )}
                        
                        {formData.role === 'operator' && (
                            <SelectInput
                                label="Operator Role" required
                                value={formData.operator_role}
                                onChange={(e) => onFieldChange('operator_role', e.target.value)}
                                options={operatorRoleSelectOptions}
                                errorMessage={errors.operator_role}
                            />
                        )}
                    </div>

                    <div className="pt-2 border-t border-slate-50">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Location & Access
                        </h4>
                        
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-slate-700">Primary Location</p>
                                    <p className="text-sm font-black text-slate-900 mt-1">
                                        {adminLocation?.name || 'Loading...'}
                                    </p>
                                    {adminLocation?.address && (
                                        <p className="text-xs text-slate-500 mt-0.5">{adminLocation.address}</p>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-3">
                                Staff will be assigned to your location. Use &quot;Assign Locations&quot; to add more locations after creation.
                            </p>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer group bg-white">
                            <div className="flex-1">
                                <p className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                                    Grant Full Access
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {formData.activation_status === 'APPROVE' 
                                        ? 'Staff can access system immediately' 
                                        : 'Staff requires approval before accessing system'}
                                </p>
                            </div>
                            <label className="flex items-center cursor-pointer">
                                <div className={clsx(
                                    "w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0",
                                    formData.activation_status === 'APPROVE' ? "bg-emerald-500" : "bg-slate-200"
                                )}>
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={formData.activation_status === 'APPROVE'}
                                        onChange={(e) => onFieldChange('activation_status', e.target.checked ? 'APPROVE' : 'REJECT')}
                                    />
                                    <div className={clsx(
                                        "absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-200 shadow-sm",
                                        formData.activation_status === 'APPROVE' && "translate-x-5"
                                    )} />
                                </div>
                            </label>
                        </div>
                    </div>
                </form>

                <div className="pt-4 pb-6 sticky bottom-0 bg-white z-10 border-t border-slate-50 px-6">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        onClick={onSubmit}
                        className="w-full py-4 bg-slate-900 hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                                Processing...
                            </>
                        ) : (
                            'Review & Create'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
