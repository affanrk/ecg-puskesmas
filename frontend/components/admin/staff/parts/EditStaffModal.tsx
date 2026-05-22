'use client';

import { useState, useCallback, useMemo } from 'react';
import { X, Save } from 'lucide-react';
import clsx from 'clsx';

import FlatpickrInput from '@/components/shared/FlatpickrInput';
import SelectInput from '@/components/shared/SelectInput';
import StandardInput from '@/components/shared/StandardInput';
import ReviewSummaryTable from '@/components/shared/ReviewSummaryTable';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { genderOptions, operatorRoleOptions, doctorSpecialtyOptions } from '@/data';
import { User, StaffEditFormData } from '@/types/user';
import { validators } from '@/utils/validators';

interface EditStaffModalProps {
    staff: User;
    onClose: () => void;
    onSave: (staffId: string, data: Partial<User>) => Promise<{ success: boolean, message?: string, fieldErrors?: Record<string, string> }>;
}

export default function EditStaffModal({ staff, onClose, onSave }: EditStaffModalProps) {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [serverError, setServerError] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const profile = staff.role === 'doctor' ? staff.doctor_profile : staff.operator_profile;

    const [formData, setFormData] = useState<StaffEditFormData>({
        full_name: profile?.full_name || '',
        nik: profile?.nik || '',
        pob: profile?.pob || '',
        dob: profile?.dob || '',
        gender: profile?.gender || '',
        address: profile?.address || '',
        contact_number: profile?.contact_number || '',
        role: staff.role || '',
        specialty: staff.doctor_profile?.specialty || '',
        str_number: profile?.str_number || '',
        str_expiry_date: profile?.str_expiry_date || '',
        sip_number: staff.doctor_profile?.sip_number || '',
        sip_expiry_date: staff.doctor_profile?.sip_expiry_date || '',
        operator_role: staff.operator_profile?.operator_role || '',
        activation_status: staff.is_activated ? 'APPROVE' : 'REJECT',
    });

    const getChangedFields = useCallback(() => {
        const changes: { field: string; old: string; new: string }[] = [];

        const initialMap: Record<string, { label: string, value: string | null | undefined }> = {
            'full_name': { label: 'Full Name', value: profile?.full_name },
            'nik': { label: 'NIK', value: profile?.nik },
            'pob': { label: 'Place of Birth', value: profile?.pob },
            'dob': { label: 'Date of Birth', value: profile?.dob },
            'gender': { label: 'Gender', value: profile?.gender === 'L' ? 'Male' : 'Female' },
            'address': { label: 'Address', value: profile?.address },
            'contact_number': { label: 'Contact', value: profile?.contact_number },
            'str_number': { label: 'STR Number', value: profile?.str_number },
            'str_expiry_date': { label: 'STR Expiry', value: profile?.str_expiry_date },
            'activation_status': { label: 'Access Status', value: staff.is_activated ? 'Approved' : 'Rejected' },
        };

        const currentMap: Record<string, { label: string, value: string | null | undefined }> = {
            'full_name': { label: 'Full Name', value: formData.full_name },
            'nik': { label: 'NIK', value: formData.nik },
            'pob': { label: 'Place of Birth', value: formData.pob },
            'dob': { label: 'Date of Birth', value: formData.dob },
            'gender': { label: 'Gender', value: formData.gender === 'L' ? 'Male' : 'Female' },
            'address': { label: 'Address', value: formData.address },
            'contact_number': { label: 'Contact', value: formData.contact_number },
            'str_number': { label: 'STR Number', value: formData.str_number },
            'str_expiry_date': { label: 'STR Expiry', value: formData.str_expiry_date },
            'activation_status': { label: 'Access Status', value: formData.activation_status === 'APPROVE' ? 'Approved' : 'Rejected' },
        };

        if (formData.role === 'doctor') {
            initialMap['specialty'] = { label: 'Specialty', value: staff.doctor_profile?.specialty };
            initialMap['sip_number'] = { label: 'SIP Number', value: staff.doctor_profile?.sip_number };
            initialMap['sip_expiry_date'] = { label: 'SIP Expiry', value: staff.doctor_profile?.sip_expiry_date };
            
            currentMap['specialty'] = { label: 'Specialty', value: formData.specialty };
            currentMap['sip_number'] = { label: 'SIP Number', value: formData.sip_number };
            currentMap['sip_expiry_date'] = { label: 'SIP Expiry', value: formData.sip_expiry_date };
        } else if (formData.role === 'operator') {
            initialMap['operator_role'] = { label: 'Operator Role', value: staff.operator_profile?.operator_role };
            currentMap['operator_role'] = { label: 'Operator Role', value: formData.operator_role };
        }

        Object.keys(currentMap).forEach(key => {
            const oldVal = initialMap[key]?.value;
            const newVal = currentMap[key]?.value;

            const normOld = (oldVal === null || oldVal === undefined || oldVal === '') ? '' : String(oldVal).trim();
            const normNew = (newVal === null || newVal === undefined || newVal === '') ? '' : String(newVal).trim();

            if (normOld !== normNew) {
                changes.push({
                    field: initialMap[key]?.label || key,
                    old: normOld === '' ? '-' : normOld,
                    new: normNew === '' ? '-' : normNew
                });
            }
        });
        return changes;
    }, [formData, profile, staff]);

    const hasChanges = useMemo(() => getChangedFields().length > 0, [getChangedFields]);

    const validateField = (field: string, value: string) => {
        if (field === 'full_name') return validators.name(value);
        if (field === 'nik') return validators.nik(value);
        if (field === 'pob') return validators.required(value);
        if (field === 'dob') return validators.dob(value);
        if (field === 'contact_number' && value) return validators.phone(value);
        return "";
    };

    const handleFieldChange = useCallback((field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        const err = validateField(field, value);
        setErrors(prev => ({ ...prev, [field]: err }));
    }, []);

    const executeSave = async () => {
        setIsConfirmOpen(false);
        setLoading(true);
        setErrors({});
        setServerError('');

        const profileData = {
            full_name: formData.full_name,
            nik: formData.nik,
            pob: formData.pob,
            dob: formData.dob,
            gender: formData.gender,
            address: formData.address,
            contact_number: formData.contact_number,
            str_number: formData.str_number,
            str_expiry_date: formData.str_expiry_date || undefined,
        };

        const payload: Record<string, unknown> = {
            activation_status: formData.activation_status,
        };

        if (formData.role === 'doctor') {
            payload.doctor_profile = {
                ...profileData,
                specialty: formData.specialty,
                sip_number: formData.sip_number,
                sip_expiry_date: formData.sip_expiry_date || undefined,
            };
        } else {
            payload.operator_profile = {
                ...profileData,
                operator_role: formData.operator_role,
            };
        }

        const result = await onSave(staff.id as string, payload);
        if (result.success) onClose();
        else {
            setErrors(result.fieldErrors || {});
            if (result.message && !result.fieldErrors) setServerError(result.message);
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};

        const nameErr = validators.name(formData.full_name);
        if (nameErr) newErrors.full_name = nameErr;

        const nikErr = validators.nik(formData.nik);
        if (nikErr) newErrors.nik = nikErr;

        if (validators.required(formData.pob)) newErrors.pob = 'Required';

        const dobErr = validators.dob(formData.dob);
        if (dobErr) newErrors.dob = dobErr;

        if (formData.contact_number) {
            const phoneErr = validators.phone(formData.contact_number);
            if (phoneErr) newErrors.contact_number = phoneErr;
        }

        if (Object.keys(newErrors).length > 0) {
            return setErrors(newErrors);
        }

        if (hasChanges) setIsConfirmOpen(true);
        else onClose();
    };

    const roleOptions = [
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
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Edit Staff Member</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">User ID: {staff.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 border border-rose-100 hover:border-rose-200 transition-all cursor-pointer">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto custom-scrollbar" noValidate>
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StandardInput
                                label="Full Name"
                                value={formData.full_name}
                                onChange={e => handleFieldChange('full_name', e.target.value)}
                                errorMessage={errors.full_name}
                                placeholder="Full name"
                            />
                            <StandardInput
                                label="NIK (16 Digits)"
                                value={formData.nik}
                                onChange={e => handleFieldChange('nik', e.target.value)}
                                errorMessage={errors.nik}
                                placeholder="NIK"
                                maxLength={16}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StandardInput
                                label="Place of Birth"
                                value={formData.pob}
                                onChange={e => handleFieldChange('pob', e.target.value)}
                                errorMessage={errors.pob}
                                placeholder="Place of birth"
                            />
                            <FlatpickrInput
                                label="Date of Birth"
                                value={formData.dob}
                                onChange={(date) => handleFieldChange('dob', date)}
                                placeholder="Select date"
                                errorMessage={errors.dob}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SelectInput
                                label="Gender"
                                value={formData.gender}
                                onChange={e => handleFieldChange('gender', e.target.value)}
                                options={[
                                    { value: '', label: 'Select Gender...' },
                                    ...genderOptions
                                ]}
                                errorMessage={errors.gender}
                            />
                            <StandardInput
                                label="Contact Number"
                                value={formData.contact_number}
                                onChange={e => handleFieldChange('contact_number', e.target.value)}
                                errorMessage={errors.contact_number}
                                placeholder="Contact number"
                            />
                        </div>
                        <StandardInput
                            label="Address"
                            value={formData.address}
                            onChange={e => handleFieldChange('address', e.target.value)}
                            placeholder="Address"
                        />
                    </div>

                    <div className="space-y-4 pt-2 border-t border-slate-100">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Professional Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SelectInput
                                label="Role"
                                value={formData.role}
                                onChange={e => handleFieldChange('role', e.target.value)}
                                options={roleOptions}
                                disabled
                            />
                            <StandardInput
                                label="STR Number"
                                value={formData.str_number}
                                onChange={e => handleFieldChange('str_number', e.target.value)}
                                placeholder="STR number"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FlatpickrInput
                                label="STR Expiry Date"
                                value={formData.str_expiry_date}
                                onChange={(date) => handleFieldChange('str_expiry_date', date)}
                                placeholder="Select expiry date"
                            />
                        </div>

                        {formData.role === 'doctor' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <SelectInput
                                        label="Specialty"
                                        value={formData.specialty}
                                        onChange={e => handleFieldChange('specialty', e.target.value)}
                                        options={doctorSpecialtySelectOptions}
                                    />
                                    <StandardInput
                                        label="SIP Number"
                                        value={formData.sip_number}
                                        onChange={e => handleFieldChange('sip_number', e.target.value)}
                                        placeholder="SIP number"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FlatpickrInput
                                        label="SIP Expiry Date"
                                        value={formData.sip_expiry_date}
                                        onChange={(date) => handleFieldChange('sip_expiry_date', date)}
                                        placeholder="Select expiry date"
                                    />
                                </div>
                            </>
                        )}

                        {formData.role === 'operator' && (
                            <SelectInput
                                label="Operator Role"
                                value={formData.operator_role}
                                onChange={e => handleFieldChange('operator_role', e.target.value)}
                                options={operatorRoleSelectOptions}
                            />
                        )}
                    </div>

                    <div className="space-y-4 pt-2 border-t border-slate-100">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Access Control
                        </h3>
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
                                        onChange={(e) => handleFieldChange('activation_status', e.target.checked ? 'APPROVE' : 'REJECT')}
                                    />
                                    <div className={clsx(
                                        "absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform duration-200 shadow-sm",
                                        formData.activation_status === 'APPROVE' && "translate-x-5"
                                    )} />
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 pb-6 -bottom-6 sticky bg-white z-10 border-t border-slate-50 mt-4">
                        {serverError && !Object.keys(errors).length && <p className="text-[10px] font-bold text-rose-500 text-center mb-2">{serverError}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className={clsx(
                                "w-full py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2",
                                hasChanges ? "bg-slate-900 hover:bg-blue-600 text-white cursor-pointer" : "bg-slate-100 text-slate-400 cursor-not-allowed",
                                loading && "bg-slate-200 text-slate-400 hover:bg-slate-200 cursor-not-allowed"
                            )}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Update Staff Profile
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={executeSave}
                title="Review Profile Changes"
                message={
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500 font-medium">
                            Review changes to <span className="font-bold text-slate-700">{profile?.full_name || staff.username}</span>.
                        </p>
                        <ReviewSummaryTable changes={getChangedFields()} />
                    </div>
                }
                confirmText="Confirm & Save Changes"
            />
        </div>
    );
}
