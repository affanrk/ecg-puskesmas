'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

import { X, Search, UserPlus, CheckCircle, Loader2, ArrowLeft, RefreshCw, Lock, MapPin } from 'lucide-react';

import FlatpickrInput from '@/components/shared/FlatpickrInput';
import SelectInput from '@/components/shared/SelectInput';
import StandardInput from '@/components/shared/StandardInput';
import { genderOptions, medicalHistoryOptions } from '@/data';
import { useToast } from '@/hooks/useToast';
import { api } from '@/services';
import { useStore } from '@/store/useStore';
import { WalkinPatient, WalkinPatientPayload } from '@/types/user';
import { parseApiError } from '@/utils/helpers';
import { validators } from '@/utils/validators';

interface PatientSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const EMPTY_FORM: WalkinPatientPayload = {
    full_name: '', nik: '', pob: '', dob: '', gender: '',
    address: '', contact_number: '', medical_history: ''
};

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

export default function PatientSelectorModal({ isOpen, onClose }: PatientSelectorModalProps) {
    const { operatorPatient, setOperatorPatient } = useStore();
    const user = useStore(state => state.user);
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
    const [operatorLocation, setOperatorLocation] = useState<string>('');

    useEffect(() => {
        const fetchOperatorLocation = async () => {
            try {
                let locationId = user?.operator_profile?.location_id;
                
                if (!locationId && user?.location_assignments && user.location_assignments.length > 0) {
                    const primaryLocation = user.location_assignments.find(loc => loc.is_primary);
                    locationId = primaryLocation?.location_id || user.location_assignments[0].location_id;
                }
                
                if (locationId) {
                    const locations = await api.fetchPublicLocations();
                    const locationsData = Array.isArray(locations) ? locations : locations?.data || [];
                    const location = locationsData.find((loc: { id: string; name: string }) => loc.id === locationId);
                    if (location) {
                        setOperatorLocation(location.name);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch operator location", error);
            }
        };
        if (user && isOpen) {
            fetchOperatorLocation();
        }
    }, [user, isOpen]);

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

    const handleSelectPatient = async (patient: WalkinPatient) => {
        if (patient.locked_by && patient.locked_by !== user?.id) {
            toast(`Patient is currently being monitored by another operator`, 'error');
            return;
        }

        try {
            const lockResult = await api.lockPatient(patient.id);
            if (lockResult.success) {
                setOperatorPatient(patient);
                toast(`Patient ${patient.full_name} selected for monitoring`, 'success');
                onClose();
            } else {
                toast(lockResult.message || 'Failed to lock patient', 'error');
            }
        } catch (error) {
            const err = error as Error;
            toast(err.message || 'Failed to lock patient', 'error');
        }
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
                                onClick={async () => {
                                    if (operatorPatient?.id) {
                                        try {
                                            await api.unlockPatient(operatorPatient.id);
                                        } catch (err) {
                                            console.error('Failed to unlock patient:', err);
                                        }
                                    }
                                    setOperatorPatient(null);
                                    await loadPatients(debouncedSearch);
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
                                        {patients.map(p => {
                                            const isLocked = p.locked_by && p.locked_by !== user?.id;
                                            const isLockedByMe = p.locked_by === user?.id;
                                            return (
                                                <li
                                                    key={p.id}
                                                    onClick={() => !isLocked && handleSelectPatient(p)}
                                                    className={`px-5 py-4 flex items-center justify-between gap-4 transition-all duration-300 group border-l-4 ${
                                                        isLocked 
                                                            ? 'bg-slate-50/50 border-slate-300 cursor-not-allowed opacity-60' 
                                                            : operatorPatient?.id === p.id || isLockedByMe
                                                            ? 'bg-indigo-50/50 border-indigo-500 cursor-pointer' 
                                                            : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-300 cursor-pointer'
                                                    }`}
                                                >
                                                    <div className="flex flex-col gap-1 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-black text-slate-800 group-hover:text-indigo-700 transition-colors">{p.full_name}</span>
                                                            {isLocked && (
                                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-100 border border-rose-200 rounded-md text-[9px] font-black uppercase tracking-widest text-rose-600">
                                                                    <Lock size={10} />
                                                                    Locked
                                                                </span>
                                                            )}
                                                            {isLockedByMe && (
                                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 border border-emerald-200 rounded-md text-[9px] font-black uppercase tracking-widest text-emerald-600">
                                                                    <CheckCircle size={10} />
                                                                    Your Lock
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-500">{p.nik ? `NIK: ${p.nik}` : 'WALK-IN'}</span>
                                                            <span>•</span>
                                                            <span>{p.gender === 'L' ? 'MALE' : 'FEMALE'}</span>
                                                            <span>•</span>
                                                            <span>{p.dob}</span>
                                                        </div>
                                                    </div>
                                                    {!isLocked && (operatorPatient?.id === p.id || isLockedByMe) ? (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 border border-indigo-200 rounded-lg shrink-0 shadow-sm">
                                                            <CheckCircle size={14} className="text-indigo-600" />
                                                            <span className="text-[10px] font-black tracking-widest uppercase text-indigo-700">Selected</span>
                                                        </div>
                                                    ) : !isLocked ? (
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shrink-0 shadow-sm">
                                                                <span className="text-[10px] font-black tracking-widest uppercase text-slate-600">Select</span>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </li>
                                            );
                                        })}
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
                            {operatorLocation && (
                                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-2 border-indigo-200 rounded-xl p-4 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0 shadow-md">
                                            <MapPin size={20} className="text-white" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider mb-1">
                                                Location Assignment
                                            </h4>
                                            <p className="text-xs text-indigo-700 font-medium leading-relaxed">
                                                Patient will be assigned to <span className="font-black text-indigo-900">{operatorLocation}</span>
                                            </p>
                                            <p className="text-[10px] text-indigo-600 mt-1.5 font-medium">
                                                This patient will be registered at your current location automatically.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                <div className="md:col-span-2">
                                    <StandardInput
                                        label="Full Name"
                                        value={formData.full_name}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setFormData(prev => ({ ...prev, full_name: value }));
                                            if (touched.full_name) {
                                                setErrors(prev => ({ ...prev, full_name: validateField('full_name', value) }));
                                            }
                                        }}
                                        onBlur={() => {
                                            setTouched(prev => ({ ...prev, full_name: true }));
                                            setErrors(prev => ({ ...prev, full_name: validateField('full_name', formData.full_name) }));
                                        }}
                                        placeholder="e.g. Budi Santoso"
                                        required
                                        errorMessage={errors.full_name}
                                        colorTheme="brand"
                                    />
                                </div>

                                <StandardInput
                                    label="NIK (16 digits)"
                                    value={formData.nik || ''}
                                    onChange={(e) => {
                                        const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                                        setFormData(prev => ({ ...prev, nik: digits }));
                                        if (touched.nik) {
                                            setErrors(prev => ({ ...prev, nik: validateField('nik', digits) }));
                                        }
                                    }}
                                    onBlur={() => {
                                        setTouched(prev => ({ ...prev, nik: true }));
                                        setErrors(prev => ({ ...prev, nik: validateField('nik', formData.nik || '') }));
                                    }}
                                    placeholder="3171234567890123"
                                    maxLength={16}
                                    type="text"
                                    required
                                    errorMessage={errors.nik}
                                    colorTheme="brand"
                                />

                                <SelectInput
                                    label="Gender"
                                    value={formData.gender}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFormData(prev => ({ ...prev, gender: value }));
                                        if (touched.gender) {
                                            setErrors(prev => ({ ...prev, gender: validateField('gender', value) }));
                                        }
                                    }}
                                    options={[
                                        { value: '', label: 'Select Gender' },
                                        ...genderOptions.map(opt => ({ value: opt.value, label: opt.label }))
                                    ]}
                                    required
                                    errorMessage={errors.gender}
                                    searchable={true}
                                    colorTheme="brand"
                                />

                                <StandardInput
                                    label="Place of Birth"
                                    value={formData.pob}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFormData(prev => ({ ...prev, pob: value }));
                                        if (touched.pob) {
                                            setErrors(prev => ({ ...prev, pob: validateField('pob', value) }));
                                        }
                                    }}
                                    onBlur={() => {
                                        setTouched(prev => ({ ...prev, pob: true }));
                                        setErrors(prev => ({ ...prev, pob: validateField('pob', formData.pob) }));
                                    }}
                                    placeholder="e.g. Jakarta"
                                    required
                                    errorMessage={errors.pob}
                                    colorTheme="brand"
                                />

                                <FlatpickrInput
                                    label="Date of Birth"
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
                                    required
                                />

                                <StandardInput
                                    label="Contact Number"
                                    value={formData.contact_number || ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFormData(prev => ({ ...prev, contact_number: value }));
                                        if (touched.contact_number) {
                                            setErrors(prev => ({ ...prev, contact_number: validateField('contact_number', value) }));
                                        }
                                    }}
                                    onBlur={() => {
                                        setTouched(prev => ({ ...prev, contact_number: true }));
                                        setErrors(prev => ({ ...prev, contact_number: validateField('contact_number', formData.contact_number || '') }));
                                    }}
                                    placeholder="e.g. 081234567890"
                                    errorMessage={errors.contact_number}
                                    colorTheme="brand"
                                />

                                <div className="md:col-span-2">
                                    <StandardInput
                                        label="Address"
                                        value={formData.address || ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setFormData(prev => ({ ...prev, address: value }));
                                        }}
                                        placeholder="Residential address (optional)"
                                        colorTheme="brand"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <SelectInput
                                        label="Medical History"
                                        value={formData.medical_history || ''}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setFormData(prev => ({ ...prev, medical_history: value }));
                                            if (touched.medical_history) {
                                                setErrors(prev => ({ ...prev, medical_history: validateField('medical_history', value) }));
                                            }
                                        }}
                                        options={[
                                            { value: '', label: 'Select Condition (Optional)' },
                                            ...medicalHistoryOptions.map(opt => ({ value: opt.value, label: opt.label }))
                                        ]}
                                        required={false}
                                        errorMessage={errors.medical_history}
                                        searchable={true}
                                        colorTheme="brand"
                                    />
                                </div>
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
