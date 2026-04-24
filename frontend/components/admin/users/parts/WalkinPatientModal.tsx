'use client';

import React, { useState, useCallback } from 'react';
import { X, Save, UserCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { WalkinPatientPayload, ConvertWalkinPayload, User, ProfileData } from '@/types/user';
import StandardInput from '@/components/shared/StandardInput';
import SelectInput from '@/components/shared/SelectInput';
import FlatpickrInput from '@/components/shared/FlatpickrInput';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import ReviewSummaryTable from '../../../shared/ReviewSummaryTable';
import { validators } from '@/utils/validators';
import { genderOptions, medicalHistoryOptions } from '@/data';

interface WalkinPatientModalProps {
    patient: User;
    onClose: () => void;
    onSave: (id: string, data: WalkinPatientPayload) => Promise<{ success: boolean; message?: string }>;
    onConvert: (id: string, data: ConvertWalkinPayload) => Promise<{ success: boolean; message?: string }>;
}

export default function WalkinPatientModal({ patient, onClose, onSave, onConvert }: WalkinPatientModalProps) {
    const [view, setView] = useState<'edit' | 'convert'>('edit');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [serverError, setServerError] = useState('');

    const [formData, setFormData] = useState<WalkinPatientPayload>({
        full_name: patient.patient_profile?.full_name || '',
        nik: patient.patient_profile?.nik || '',
        pob: patient.patient_profile?.pob || '',
        dob: patient.patient_profile?.dob || '',
        gender: patient.patient_profile?.gender || 'L',
        address: patient.patient_profile?.address || '',
        contact_number: patient.patient_profile?.contact_number || '',
        medical_history: patient.patient_profile?.medical_history || ''
    });

    const [convertData, setConvertData] = useState<ConvertWalkinPayload>({
        username: '',
        email: '',
        password: ''
    });

    const handleFieldChange = useCallback((field: string, value: string | number | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (typeof value === 'string') {
            let err = '';
            if (field === 'full_name') err = validators.name(value);
            else if (field === 'nik') err = validators.nik(value);
            else if (field === 'pob') err = validators.required(value);
            else if (field === 'dob') err = validators.dob(value);
            else if (field === 'contact_number') err = validators.phone(value);
            setErrors(prev => ({ ...prev, [field]: err }));
        }
    }, []);

    const handleConvertFieldChange = useCallback((field: string, value: string) => {
        setConvertData(prev => ({ ...prev, [field]: value }));
        let err = '';
        if (field === 'username') err = validators.username(value);
        else if (field === 'email') err = validators.email(value);
        else if (field === 'password') err = value ? validators.password(value) : '';
        setErrors(prev => ({ ...prev, [field]: err }));
    }, []);

    const handleSwitchView = () => {
        setErrors({});
        setServerError('');
        setView(v => {
            const next = v === 'edit' ? 'convert' : 'edit';
            if (next === 'convert') {
                setConvertData({ username: '', email: '', password: '' });
            } else {
                setFormData({
                    full_name: patient.patient_profile?.full_name || '',
                    nik: patient.patient_profile?.nik || '',
                    pob: patient.patient_profile?.pob || '',
                    dob: patient.patient_profile?.dob || '',
                    gender: patient.patient_profile?.gender || 'L',
                    address: patient.patient_profile?.address || '',
                    contact_number: patient.patient_profile?.contact_number || '',
                    medical_history: patient.patient_profile?.medical_history || ''
                });
            }
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setServerError('');

        const newErrors: Record<string, string> = {};

        if (view === 'edit') {
            const nameErr = validators.name(formData.full_name);
            if (nameErr) newErrors.full_name = nameErr;

            const nikErr = validators.nik(formData.nik || '');
            if (nikErr) newErrors.nik = nikErr;

            if (validators.required(formData.pob)) newErrors.pob = 'Required';

            const dobErr = validators.dob(formData.dob);
            if (dobErr) newErrors.dob = dobErr;

            if (formData.contact_number) {
                const phoneErr = validators.phone(formData.contact_number);
                if (phoneErr) newErrors.contact_number = phoneErr;
            }
        } else {
            const usernameErr = validators.username(convertData.username);
            if (usernameErr) newErrors.username = usernameErr;

            const emailErr = validators.email(convertData.email);
            if (emailErr) newErrors.email = emailErr;
            if (convertData.password && convertData.password.trim() !== '') {
                const passErr = validators.password(convertData.password);
                if (passErr) newErrors.password = passErr;
            }
        }

        if (Object.keys(newErrors).length > 0) {
            return setErrors(newErrors);
        }

        setIsConfirmOpen(true);
        return;
    };

    const handleConfirm = async () => {
        setIsConfirmOpen(false);
        setIsSubmitting(true);
        setServerError('');
        const result = view === 'edit'
            ? await onSave(patient.id as string, formData)
            : await onConvert(patient.id as string, convertData);

        if (!result.success && result.message) {
            setServerError(result.message);
        }
        setIsSubmitting(false);
    };

    const getChangedFields = () => {
        const fields: { key: keyof WalkinPatientPayload; label: string }[] = [
            { key: 'full_name', label: 'Full Name' },
            { key: 'nik', label: 'NIK' },
            { key: 'pob', label: 'Place of Birth' },
            { key: 'dob', label: 'Date of Birth' },
            { key: 'gender', label: 'Gender' },
            { key: 'contact_number', label: 'Contact' },
            { key: 'address', label: 'Address' },
            { key: 'medical_history', label: 'Medical History' },
        ];

        const changes: { field: string; old: string; new: string }[] = [];

        const original: ProfileData = patient.patient_profile || ({} as ProfileData);

        fields.forEach(f => {
            const oldVal = (original as Record<string, unknown>)[f.key as string];
            const newVal = (formData as WalkinPatientPayload)[f.key];

            const normOld = oldVal === null || oldVal === undefined || oldVal === '' ? '' : String(oldVal).trim();
            const normNew = newVal === null || newVal === undefined || newVal === '' ? '' : String(newVal).trim();

            if (normOld !== normNew) {
                changes.push({ field: f.label, old: normOld === '' ? '-' : normOld, new: normNew === '' ? '-' : normNew });
            }
        });

        return changes;
    };

    const hasChanges = getChangedFields().length > 0;

    const convertSummaryData = () => {
        const pwdProvided = convertData.password && convertData.password.trim() !== '';
        return [
            { field: 'Username', value: convertData.username || '-' },
            { field: 'Email', value: convertData.email || '-' },
            { field: 'Password', value: pwdProvided ? 'Provided' : 'user1234 (default)' },
            { field: 'Require Reset', value: pwdProvided ? 'No' : 'Yes' },
        ];
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden relative z-10">

                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">
                            {view === 'edit' ? 'Edit Walk-in Patient' : 'Convert to User Account'}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {view === 'edit'
                                ? `Patient ID: ${patient.id}`
                                : 'Register this patient to allow login access'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {view === 'edit' ? (
                            <button
                                type="button"
                                onClick={handleSwitchView}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-indigo-200 active:scale-95 transition-all cursor-pointer"
                            >
                                <RefreshCw size={13} strokeWidth={3} />
                                Convert Account
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSwitchView}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all cursor-pointer"
                            >
                                <ArrowLeft size={13} strokeWidth={3} />
                                Back to Edit
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 border border-rose-100 hover:border-rose-200 transition-all active:scale-95 cursor-pointer"
                        >
                            <X size={18} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/40">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>

                        {view === 'edit' && (
                            <>
                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        Patient Information
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <StandardInput
                                                label="Full Name"
                                                value={formData.full_name}
                                                onChange={e => handleFieldChange('full_name', e.target.value)}
                                                errorMessage={errors.full_name}
                                                placeholder="Enter patient full name"
                                            />
                                        </div>
                                        <StandardInput
                                            label="NIK (16 Digits)"
                                            value={formData.nik || ''}
                                            onChange={e => handleFieldChange('nik', e.target.value.replace(/\D/g, '').slice(0, 16))}
                                            errorMessage={errors.nik}
                                            placeholder="16-digit ID number"
                                        />
                                        <SelectInput
                                            label="Gender"
                                            value={formData.gender}
                                            onChange={e => handleFieldChange('gender', e.target.value)}
                                            options={genderOptions}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <StandardInput
                                            label="Place of Birth"
                                            value={formData.pob}
                                            onChange={e => handleFieldChange('pob', e.target.value)}
                                            errorMessage={errors.pob}
                                            placeholder="City"
                                        />
                                        <FlatpickrInput
                                            label="Date of Birth"
                                            value={formData.dob}
                                            onChange={date => handleFieldChange('dob', date)}
                                            errorMessage={errors.dob}
                                            placeholder="Select Date"
                                        />
                                        <StandardInput
                                            label="Contact Number"
                                            value={formData.contact_number || ''}
                                            onChange={e => handleFieldChange('contact_number', e.target.value)}
                                            errorMessage={errors.contact_number}
                                            placeholder="+62... (Optional)"
                                        />
                                    </div>

                                    <StandardInput
                                        label="Residential Address"
                                        value={formData.address || ''}
                                        onChange={e => handleFieldChange('address', e.target.value)}
                                        errorMessage={errors.address}
                                        placeholder="Street, City, Province (Optional)"
                                    />

                                    <SelectInput
                                        label="Medical History"
                                        value={formData.medical_history || ''}
                                        onChange={e => handleFieldChange('medical_history', e.target.value)}
                                        options={[
                                            { value: '', label: 'Select Condition (Optional)' },
                                            ...medicalHistoryOptions
                                        ]}
                                    />
                                </div>
                            </>
                        )}

                        {view === 'convert' && (
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                    Account Credentials
                                </h3>

                                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                                    <UserCheck size={16} className="text-amber-600 mt-0.5 shrink-0" />
                                    <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                                        Converting a walk-in patient creates a full system account.
                                        They will be able to log in to the platform.
                                    </p>
                                </div>

                                <div className="max-w-sm mx-auto w-full space-y-4">
                                    <StandardInput
                                        label="Username"
                                        value={convertData.username}
                                        onChange={e => handleConvertFieldChange('username', e.target.value)}
                                        errorMessage={errors.username}
                                        placeholder="e.g. jdoe123"
                                    />
                                    <StandardInput
                                        label="Email Address"
                                        value={convertData.email}
                                        onChange={e => handleConvertFieldChange('email', e.target.value)}
                                        errorMessage={errors.email}
                                        placeholder="john@example.com"
                                    />
                                    <StandardInput
                                        label="Password (Optional)"
                                        type="password"
                                        value={convertData.password || ''}
                                        onChange={e => handleConvertFieldChange('password', e.target.value)}
                                        errorMessage={errors.password}
                                        placeholder="Leave empty for default password"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            {serverError && (
                                <p className="text-[10px] font-bold text-rose-500 self-center mr-auto">
                                    {serverError}
                                </p>
                            )}

                            <button
                                type="button"
                                onClick={() => {
                                    if (isSubmitting) return;
                                    if (view === 'edit') {
                                        if (!hasChanges) {
                                            onClose();
                                            return;
                                        }
                                        handleSubmit({ preventDefault: () => { } } as unknown as React.FormEvent);
                                    } else {
                                        handleSubmit({ preventDefault: () => { } } as unknown as React.FormEvent);
                                    }
                                }}
                                className={"w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2 " + (view === 'edit' ? (hasChanges ? "bg-slate-900 hover:bg-blue-600 text-white cursor-pointer" : "bg-slate-100 text-slate-400 cursor-not-allowed") : (isSubmitting ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-blue-600 text-white cursor-pointer"))}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin" />
                                        {view === 'edit' ? 'Updating...' : 'Converting...'}
                                    </>
                                ) : (
                                    <>
                                        <Save size={14} strokeWidth={3} />
                                        {view === 'edit' ? 'Update Profile' : 'Convert Account'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirm}
                title={view === 'edit' ? "Confirm Update" : "Confirm Convert Account"}
                message={
                    view === 'edit' ? (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500">Review changes for <span className="font-bold">{patient.patient_profile?.full_name || patient.id}</span> before saving.</p>
                            <ReviewSummaryTable changes={getChangedFields()} />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-500">Create account for <span className="font-bold">{patient.patient_profile?.full_name || patient.id}</span>. Review credentials below.</p>
                            <ReviewSummaryTable data={convertSummaryData()} />
                        </div>
                    )
                }
                confirmText={view === 'edit' ? 'Confirm & Save Changes' : 'Confirm & Convert'}
            />
        </div>
    );
}
