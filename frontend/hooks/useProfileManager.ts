'use client';

import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import axiosInstance from '@/services/axiosInstance';
import { api } from '@/services/api';
import { useStore } from '@/store/useStore';
import { useToast } from '@/hooks/useToast';
import { parseApiError } from '@/utils/helpers';
import { validators } from '@/utils/validators';
import { getActiveProfile } from '@/utils/helpers';
import ReviewSummaryTable from '@/components/admin/users/parts/ReviewSummaryTable';

export function useProfileManager() {
    const { user, setUser } = useStore();
    const { show: toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'medical' | 'security'>('medical');
    const [medicalForm, setMedicalForm] = useState({
        full_name: '',
        nik: '',
        pob: '',
        dob: '',
        gender: 'L',
        contact_number: '',
        address: '',
        medical_history: '',
        str_number: '',
        sip_number: '',
        specialty: '',
        work_location: ''
    });
    const [securityForm, setSecurityForm] = useState({
        new_username: '',
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [rejectionReason, setRejectionReason] = useState<string | null>(null);
    const [isEditingMedical, setIsEditingMedical] = useState(false);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        type: 'identity' | 'medical' | 'username' | 'password' | null;
        title: string;
        message: ReactNode;
        action: () => Promise<void>;
        isDestructive?: boolean;
        confirmText?: string;
    }>({
        isOpen: false,
        type: null,
        title: '',
        message: '',
        action: async () => { },
        isDestructive: false,
        confirmText: 'Confirm'
    });

    const resetForms = useCallback(() => {
        if (user) {
            setMedicalForm({
                full_name: (getActiveProfile(user)?.full_name || "") || '',
                nik: (getActiveProfile(user)?.nik || "") || '',
                pob: (getActiveProfile(user)?.pob || "") || '',
                dob: (getActiveProfile(user)?.dob || "") || '',
                gender: (getActiveProfile(user)?.gender || "") || 'L',
                contact_number: (getActiveProfile(user)?.contact_number || "") || '',
                address: (getActiveProfile(user)?.address || "") || '',
                medical_history: (getActiveProfile(user)?.medical_history || "") || '',
                str_number: (getActiveProfile(user)?.str_number || "") || '',
                sip_number: (getActiveProfile(user)?.sip_number || "") || '',
                specialty: (getActiveProfile(user)?.specialty || "") || '',
                work_location: (getActiveProfile(user)?.work_location || "") || ''
            });
            setSecurityForm(p => ({ ...p, new_username: user.username, current_password: '', new_password: '', confirm_password: '' }));
            setRejectionReason(user.rejection_reason || null);
            setErrors({});
        }
    }, [user]);

    useEffect(() => {
        resetForms();
    }, [user, resetForms]);

    const validateField = useCallback((field: string, value: string) => {
        let error = "";
        switch (field) {
            case 'nik':
                error = validators.nik(value);
                break;
            case 'full_name':
                error = validators.name(value);
                break;
            case 'pob':
                error = validators.required(value);
                if (!error && value.length < 2) error = "Place of birth too short";
                break;
            case 'dob':
                error = validators.dob(value);
                break;
            case 'contact_number':
                error = validators.phone(value);
                break;
            case 'str_number':
                error = validators.required(value);
                break;
            case 'sip_number':
                error = validators.required(value);
                break;
            case 'specialty':
                error = validators.required(value);
                break;
            case 'new_username':
                error = validators.username(value);
                break;
            case 'new_password':
                error = validators.password(value);
                break;
            case 'confirm_password':
                if (value && value !== securityForm.new_password) return "Passwords do not match";
                break;
        }
        return error;
    }, [securityForm.new_password]);

    const runFullMedicalValidation = () => {
        const newErrors: Record<string, string> = {};
        const isLocked = user?.is_patient || user?.is_operator || user?.is_doctor;
        if (!isLocked) {
            const nikErr = validators.nik(medicalForm.nik);
            if (nikErr) newErrors.nik = nikErr;

            const nameErr = validators.name(medicalForm.full_name);
            if (nameErr) newErrors.full_name = nameErr;

            const dobErr = validators.dob(medicalForm.dob);
            if (dobErr) newErrors.dob = dobErr;

            if (validators.required(medicalForm.pob)) newErrors.pob = "Place of Birth required";

            if (user?.role === 'operator') {
                if (validators.required(medicalForm.str_number)) newErrors.str_number = "Required";
            }
            if (user?.role === 'doctor') {
                if (validators.required(medicalForm.str_number)) newErrors.str_number = "Required";
                if (validators.required(medicalForm.sip_number)) newErrors.sip_number = "Required";
                if (validators.required(medicalForm.specialty)) newErrors.specialty = "Required";
            }
        }

        const phoneErr = validators.phone(medicalForm.contact_number);
        if (phoneErr) newErrors.contact_number = phoneErr;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleMedicalChange = useCallback((field: string, value: string) => {
        setMedicalForm(prev => ({ ...prev, [field]: value }));
        const error = validateField(field, value);
        setErrors(prev => ({ ...prev, [field]: error }));
    }, [validateField]);

    const handleSecurityChange = useCallback((field: string, value: string) => {
        setSecurityForm(prev => ({ ...prev, [field]: value }));
        const error = validateField(field, value);
        setErrors(prev => ({ ...prev, [field]: error }));
    }, [validateField]);

    const handleApiError = (err: Parameters<typeof parseApiError>[0], defaultField?: string) => {
        const { message, fieldErrors } = parseApiError(err);

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...fieldErrors }));
        } else if (defaultField && message) {
            setErrors(prev => ({ ...prev, [defaultField]: message }));
        } else if (message) {
            toast(message, "error");
        }
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    };

    const executeSaveProfile = async () => {
        setLoading(true);
        try {

            let res;

            if (user?.is_patient) {
                const payload = {
                    ...medicalForm,
                    full_name: medicalForm.full_name || null,
                    nik: medicalForm.nik || null,
                    pob: medicalForm.pob || null,
                    dob: medicalForm.dob || null,
                    address: medicalForm.address || null,
                    contact_number: medicalForm.contact_number || null,
                    medical_history: medicalForm.medical_history || null,
                    source: 'WEB'
                };
                res = await api.updatePatientProfile(payload);
            } else if (user?.is_operator) {
                const payload = {
                    ...medicalForm,
                    full_name: medicalForm.full_name || null,
                    nik: medicalForm.nik || null,
                    pob: medicalForm.pob || null,
                    dob: medicalForm.dob || null,
                    address: medicalForm.address || null,
                    contact_number: medicalForm.contact_number || null,
                    str_number: medicalForm.str_number || null,
                    work_location: medicalForm.work_location || null,
                    source: 'WEB'
                };
                res = await api.updateOperatorProfile(payload);
            } else if (user?.is_doctor) {
                const payload = {
                    ...medicalForm,
                    full_name: medicalForm.full_name || null,
                    nik: medicalForm.nik || null,
                    pob: medicalForm.pob || null,
                    dob: medicalForm.dob || null,
                    address: medicalForm.address || null,
                    contact_number: medicalForm.contact_number || null,
                    str_number: medicalForm.str_number || null,
                    sip_number: medicalForm.sip_number || null,
                    specialty: medicalForm.specialty || null,
                    work_location: medicalForm.work_location || null,
                    source: 'WEB'
                };
                res = await api.updateDoctorProfile(payload);
            } else {
                throw new Error("No valid role found for update");
            }

            setUser(res);
            toast("Profile updated successfully!", "success");
            setIsEditingMedical(false);
            setConfirmState(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
            handleApiError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    const executeChangeUsername = async () => {
        setLoading(true);
        try {

            const res = await axiosInstance.put('/auth/change-username', { new_username: securityForm.new_username });
            setUser(res.data);
            toast("Username updated!", "success");
            setIsEditingUsername(false);
            setConfirmState(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
            handleApiError(err as Error, 'new_username');
        } finally {
            setLoading(false);
        }
    };

    const executeChangePassword = async () => {
        setLoading(true);
        try {

            await axiosInstance.put('/auth/change-password', {
                current_password: securityForm.current_password,
                new_password: securityForm.new_password
            });
            toast("Password changed successfully!", "success");
            setSecurityForm(p => ({ ...p, current_password: '', new_password: '', confirm_password: '' }));
            setIsChangingPassword(false);
            setConfirmState(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
            handleApiError(err as Error, 'current_password');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelMedical = () => {
        setIsEditingMedical(false);
        if (user?.is_patient || user?.is_operator || user?.is_doctor) resetForms();
    };

    const handleCancelUsername = () => {
        setIsEditingUsername(false);
        setSecurityForm(prev => ({ ...prev, new_username: user?.username || '' }));
        setErrors({});
    };

    const handleCancelPassword = () => {
        setIsChangingPassword(false);
        setSecurityForm(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }));
        setErrors({});
    };

    const onSaveProfileClick = () => {
        if (!runFullMedicalValidation()) return;
        const isRejected = user?.status === 'REJECTED';
        setConfirmState({
            isOpen: true,
            type: 'medical',
            title: isRejected ? 'Review Profile Resubmission' : 'Review Profile Changes',
            message: React.createElement("div", { className: "space-y-4" },
                React.createElement("p", { className: "text-sm text-slate-500 font-medium" },
                    isRejected
                        ? 'Review your updated identity and contact details before resubmitting for administrative review.'
                        : 'Review the changes you made to your contact and professional information.'
                ),
                React.createElement(ReviewSummaryTable, {
                    data: [
                        ...(isRejected ? [
                            { field: 'Full Name', value: medicalForm.full_name },
                            { field: 'NIK', value: medicalForm.nik },
                            { field: 'Place of Birth', value: medicalForm.pob },
                            { field: 'Date of Birth', value: medicalForm.dob },
                            { field: 'Gender', value: medicalForm.gender === 'L' ? 'Male' : 'Female' },
                        ] : []),
                        { field: 'Contact Number', value: medicalForm.contact_number || '-' },
                        { field: 'Address', value: medicalForm.address || '-' },
                        ...(user?.is_patient ? [{ field: 'Medical History', value: medicalForm.medical_history || '-' }] : []),
                        ...(user?.is_operator ? [
                            { field: 'STR Number', value: medicalForm.str_number || '-' },
                            { field: 'Work Location', value: medicalForm.work_location || '-' }
                        ] : []),
                        ...(user?.is_doctor ? [
                            { field: 'STR Number', value: medicalForm.str_number || '-' },
                            { field: 'SIP Number', value: medicalForm.sip_number || '-' },
                            { field: 'Specialty', value: medicalForm.specialty || '-' },
                            { field: 'Work Location', value: medicalForm.work_location || '-' }
                        ] : [])
                    ]
                })
            ),
            action: executeSaveProfile,
            confirmText: isRejected ? 'Resubmit Profile' : 'Save Changes'
        });
    };

    const onUpdateUsernameClick = () => {
        if (errors.new_username || securityForm.new_username.length < 3) return;
        setConfirmState({
            isOpen: true,
            type: 'username',
            title: 'Review Username Change',
            message: React.createElement("div", { className: "space-y-4" },
                React.createElement("p", { className: "text-sm text-slate-500 font-medium" },
                    "Are you sure you want to change your username?"
                ),
                React.createElement(ReviewSummaryTable, {
                    changes: [
                        { field: 'Username', old: user?.username || '', new: securityForm.new_username }
                    ]
                })
            ),
            action: executeChangeUsername
        });
    };

    const onUpdatePasswordClick = () => {
        const pwdError = validateField('new_password', securityForm.new_password);
        const confirmError = validateField('confirm_password', securityForm.confirm_password);
        if (pwdError || confirmError) {
            setErrors({ new_password: pwdError, confirm_password: confirmError });
            return;
        }
        setConfirmState({
            isOpen: true,
            type: 'password',
            title: 'Review Password Change',
            message: React.createElement("div", { className: "space-y-4" },
                React.createElement("p", { className: "text-sm text-slate-500 font-medium" },
                    "Are you sure you want to update your password? You will need to use the new password next time you login."
                ),
                React.createElement(ReviewSummaryTable, {
                    changes: [
                        { field: 'Password', old: '********', new: '********' }
                    ]
                })
            ),
            action: executeChangePassword,
            isDestructive: true
        });
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        onUpdatePasswordClick();
    };

    return {
        user,
        loading,
        activeTab,
        setActiveTab,
        medicalForm,
        setMedicalForm,
        securityForm,
        setSecurityForm,
        errors,
        setErrors,
        rejectionReason,
        isEditingMedical,
        setIsEditingMedical,
        isEditingUsername,
        setIsEditingUsername,
        isChangingPassword,
        setIsChangingPassword,
        confirmState,
        setConfirmState,
        handleMedicalChange,
        handleSecurityChange,
        handleCancelMedical,
        handleCancelUsername,
        handleCancelPassword,
        onSaveProfileClick,
        onUpdateUsernameClick,
        handleChangePassword,
        onUpdatePasswordClick
    };
}