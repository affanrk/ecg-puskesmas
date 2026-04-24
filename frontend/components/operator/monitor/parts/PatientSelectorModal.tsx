'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, UserPlus, CheckCircle, Loader2, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

import { api } from '@/services/api';
import { useStore } from '@/store/useStore';
import { useToast } from '@/hooks/useToast';
import { WalkinPatient, WalkinPatientPayload } from '@/types/user';
import { parseApiError } from '@/utils/helpers';
import { validators } from '@/utils/validators';
import FlatpickrInput from '@/components/shared/FlatpickrInput';
import { medicalHistoryOptions } from '@/data';

interface PatientSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface FieldProps {
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
    className?: string;
}

const EMPTY_FORM: WalkinPatientPayload = {
    full_name: '', nik: '', pob: '', dob: '', gender: '',
    address: '', contact_number: '', medical_history: ''
};

const inputCls = (err?: string) =>
    `w-full px-4 py-3 rounded-xl border-2 text-xs font-bold transition-all duration-300 outline-none ${err
        ? 'border-rose-100 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/5 bg-rose-50/20 text-rose-900 placeholder:text-rose-300'
        : 'border-slate-100 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 bg-slate-50/50 focus:bg-white text-slate-800 placeholder:text-slate-400'
    }`;

type FormErrors = Record<string, string>;

function validateField(name: string, value: string): string {
    switch (name) {
        case 'full_name': return validators.name(value);
        case 'nik': return validators.nik(value);
        case 'pob': return validators.required(value);
        case 'dob': return validators.dob(value);
        case 'gender': return validators.required(value);
        case 'contact_number': return validators.phone(value);
        default: return '';
    }
}

function validateAll(form: WalkinPatientPayload): FormErrors {
    const errs: FormErrors = {};
    const required = ['full_name', 'pob', 'dob', 'gender'];
    [...required, 'nik', 'contact_number'].forEach(field => {
        const msg = validateField(field, (form as unknown as Record<string, string>)[field] ?? '');
        if (msg) errs[field] = msg;
    });
    return errs;
}

function Field({ label, required, error, children, className = '' }: FieldProps) {
    return (
        <div className={`relative group w-full space-y-1.5 ${className}`}>
            <label className="text-[10px] font-black uppercase tracking-[0.15em] ml-1 text-slate-400 block">
                {label} {required && <span className="text-rose-500 ml-0.5">*</span>}
            </label>
            {children}
            {error && (
                <div className="flex items-center gap-1.5 mt-1 ml-1 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle size={12} strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase tracking-wider">{error}</span>
                </div>
            )}
        </div>
    );
}

export default function PatientSelectorModal({ isOpen, onClose }: PatientSelectorModalProps) {
    const { operatorPatient, setOperatorPatient } = useStore();
    const { show: toast } = useToast();

    const [view, setView] = useState<'list' | 'create'>('list');
    const [patients, setPatients] = useState<WalkinPatient[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [formData, setFormData] = useState<WalkinPatientPayload>(EMPTY_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (view === 'create') {
            setFormData(EMPTY_FORM);
            setErrors({});
            setTouched({});
        }
    }, [view]);

    useEffect(() => {
        if (isOpen) {
            setView('list');
            setFormData(EMPTY_FORM);
            setErrors({});
            setTouched({});
            setSearchTerm('');
            setDebouncedSearch('');
        }
    }, [isOpen]);

    const loadPatients = useCallback(async (search: string = '') => {
        try {
            setIsLoading(true);
            const res = await api.fetchOperatorPatients({ search, limit: 100 });
            setPatients(res?.items || []);
        } catch (err) {
            const { message } = parseApiError(err as Error);
            toast(message || 'Failed to load patients', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => setDebouncedSearch(searchTerm), 350);
        return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
    }, [searchTerm]);

    useEffect(() => {
        if (isOpen && view === 'list') {
            loadPatients(debouncedSearch);
        }
    }, [isOpen, view, debouncedSearch, loadPatients]);

    const handleSelectPatient = (patient: WalkinPatient) => {
        setOperatorPatient(patient);
        toast(`Patient ${patient.full_name} selected for monitoring`, 'success');
        onClose();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name === 'nik') {
            const digits = value.replace(/\D/g, '').slice(0, 16);
            setFormData(prev => ({ ...prev, nik: digits }));
            if (touched[name]) {
                setErrors(prev => ({ ...prev, [name]: validateField(name, digits) }));
            }
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
        if (touched[name]) {
            setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const allFields = ['full_name', 'nik', 'pob', 'dob', 'gender', 'contact_number'];
        setTouched(Object.fromEntries(allFields.map(f => [f, true])));

        const validationErrors = validateAll(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: WalkinPatientPayload = {
                ...formData,
                nik: formData.nik || null,
                address: formData.address || null,
                contact_number: formData.contact_number || null,
                medical_history: formData.medical_history || null,
            };
            const patient = await api.createOperatorPatient(payload);
            if (patient?.id) {
                setOperatorPatient(patient);
                toast(`Patient ${patient.full_name} created and selected for monitoring`, 'success');
                await loadPatients(debouncedSearch);
                onClose();
            } else {
                toast('Failed to create patient — no patient ID in response', 'error');
            }
        } catch (err) {
            const { message, fieldErrors } = parseApiError(err as Error);
            if (fieldErrors && Object.keys(fieldErrors).length > 0) {
                setErrors(prev => ({ ...prev, ...fieldErrors }));
                toast('Please fix the errors highlighted below', 'error');
            } else {
                toast(message || 'Failed to create patient', 'error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">

                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50 shrink-0">
                    <div>
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">
                            {view === 'list' ? 'Patient Selection' : 'Register Walk-in Patient'}
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                            {view === 'list' ? 'Search records or register a new one' : 'Fill patient details for immediate monitoring'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {operatorPatient && view === 'list' && (
                            <button
                                type="button"
                                onClick={() => {
                                    setOperatorPatient(null);
                                }}
                                className="cursor-pointer flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all shadow-sm active:scale-95 text-[10px] uppercase font-black tracking-widest shrink-0"
                                title="Clear Selection"
                            >
                                <X size={14} strokeWidth={3} />
                                Clear Selection
                            </button>
                        )}
                        {view === 'create' && (
                            <button
                                type="button"
                                onClick={() => setView('list')}
                                className="cursor-pointer flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                            >
                                <ArrowLeft size={14} /> Back to List
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="cursor-pointer p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors shadow-sm active:scale-95"
                        >
                            <X size={16} strokeWidth={3} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {view === 'list' ? (
                        <div className="flex flex-col h-full gap-4">
                            <div className="flex gap-3">
                                <div className="relative flex-1 group">
                                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search records by name or NIK..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 border-2 border-slate-100 bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => loadPatients(debouncedSearch)}
                                    className="cursor-pointer flex items-center gap-1.5 px-4 py-2 bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-indigo-500 rounded-xl transition-all shadow-sm active:scale-95 text-[10px] uppercase font-black tracking-widest shrink-0"
                                    title="Refresh List"
                                >
                                    <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                                    <span>Refresh</span>
                                </button>
                                <button
                                    onClick={() => setView('create')}
                                    className="cursor-pointer flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md hover:shadow-lg active:scale-95 shrink-0"
                                >
                                    <UserPlus size={14} />
                                    <span>New Patient</span>
                                </button>
                            </div>

                            <div className="flex-1 min-h-[300px] border-2 border-slate-100 rounded-xl bg-white overflow-hidden flex flex-col shadow-sm">
                                {isLoading ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <Loader2 size={24} className="animate-spin text-slate-300" />
                                    </div>
                                ) : patients.length > 0 ? (
                                    <ul className="divide-y divide-slate-50 overflow-y-auto max-h-[385px]">
                                        {patients.map(p => (
                                            <li
                                                key={p.id}
                                                onClick={() => handleSelectPatient(p)}
                                                className={`px-5 py-4 cursor-pointer flex items-center justify-between gap-4 transition-all duration-300 group border-l-4 ${operatorPatient?.id === p.id ? 'bg-indigo-50/50 border-indigo-500' : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-300'}`}
                                            >
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-black text-slate-800 group-hover:text-indigo-700 transition-colors">{p.full_name}</span>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-500">{p.nik ? `NIK: ${p.nik}` : 'WALK-IN'}</span>
                                                        <span>•</span>
                                                        <span>{p.gender === 'L' ? 'MALE' : 'FEMALE'}</span>
                                                        <span>•</span>
                                                        <span>{p.dob}</span>
                                                    </div>
                                                </div>
                                                {operatorPatient?.id === p.id ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 border border-indigo-200 rounded-lg shrink-0 shadow-sm">
                                                        <CheckCircle size={14} className="text-indigo-600" />
                                                        <span className="text-[10px] font-black tracking-widest uppercase text-indigo-700">Selected</span>
                                                    </div>
                                                ) : (
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shrink-0 shadow-sm">
                                                            <span className="text-[10px] font-black tracking-widest uppercase text-slate-600">Select</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                            <Search size={24} className="text-slate-300" />
                                        </div>
                                        <p className="text-sm font-black text-slate-700">No patients found</p>
                                        <p className="text-[11px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">Try a different search term<br />or register a new patient.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                <Field label="Full Name" required error={errors.full_name} className="md:col-span-2">
                                    <input
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleInputChange}
                                        onBlur={handleBlur}
                                        placeholder="e.g. Budi Santoso"
                                        className={inputCls(errors.full_name)}
                                    />
                                </Field>

                                <Field label="NIK (16 digits)" required error={errors.nik}>
                                    <div className="relative">
                                        <input
                                            name="nik"
                                            value={formData.nik || ''}
                                            onChange={handleInputChange}
                                            onBlur={handleBlur}
                                            placeholder="3171234567890123"
                                            maxLength={16}
                                            inputMode="numeric"
                                            className={inputCls(errors.nik) + ' pr-12'}
                                        />
                                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold tabular-nums transition-colors ${(formData.nik?.length ?? 0) === 16 ? 'text-emerald-500' : 'text-slate-400'
                                            }`}>
                                            {formData.nik?.length ?? 0}/16
                                        </span>
                                    </div>
                                </Field>

                                <Field label="Gender" required error={errors.gender}>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleInputChange}
                                        onBlur={handleBlur}
                                        className={inputCls(errors.gender)}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="L">Male</option>
                                        <option value="P">Female</option>
                                    </select>
                                </Field>

                                <Field label="Place of Birth" required error={errors.pob}>
                                    <input
                                        name="pob"
                                        value={formData.pob}
                                        onChange={handleInputChange}
                                        onBlur={handleBlur}
                                        placeholder="e.g. Jakarta"
                                        className={inputCls(errors.pob)}
                                    />
                                </Field>

                                <Field label="Date of Birth" required>
                                    <FlatpickrInput
                                        value={formData.dob}
                                        onChange={(date) => {
                                            setFormData(prev => ({ ...prev, dob: date }));
                                            setTouched(prev => ({ ...prev, dob: true }));
                                            if (touched.dob) setErrors(prev => ({ ...prev, dob: validateField('dob', date) }));
                                        }}
                                        onBlur={(date) => {
                                            setTouched(prev => ({ ...prev, dob: true }));
                                            setErrors(prev => ({ ...prev, dob: validateField('dob', date) }));
                                        }}
                                        errorMessage={errors.dob}
                                    />
                                </Field>

                                <Field label="Contact Number" error={errors.contact_number}>
                                    <input
                                        name="contact_number"
                                        value={formData.contact_number || ''}
                                        onChange={handleInputChange}
                                        onBlur={handleBlur}
                                        placeholder="e.g. 081234567890"
                                        className={inputCls(errors.contact_number)}
                                    />
                                </Field>

                                <Field label="Address" className="md:col-span-2">
                                    <input
                                        name="address"
                                        value={formData.address || ''}
                                        onChange={handleInputChange}
                                        placeholder="Residential address (optional)"
                                        className={inputCls()}
                                    />
                                </Field>

                                <Field label="Medical History" className="md:col-span-2" error={errors.medical_history}>
                                    <select
                                        name="medical_history"
                                        value={formData.medical_history || ''}
                                        onChange={handleInputChange}
                                        onBlur={handleBlur}
                                        className={inputCls(errors.medical_history)}
                                    >
                                        <option value="">Select Condition (Optional)</option>
                                        {medicalHistoryOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </Field>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setView('list')}
                                    className="cursor-pointer px-5 py-2.5 rounded-lg border border-slate-200 bg-white text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 hover:text-slate-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="cursor-pointer relative flex items-center justify-center min-w-[160px] px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Save & Select Patient'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
