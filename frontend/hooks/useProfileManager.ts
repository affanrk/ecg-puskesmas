'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useStore } from '@/store/useStore';
import { useToast } from '@/hooks/useToast';

export function useProfileManager() {
    // 1. State Variables
    const { user, setUser } = useStore();
    const { show: toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'medical' | 'security'>('medical');

    // Form State
    const [medicalForm, setMedicalForm] = useState({
        full_name: '',
        nik: '',
        pob: '',
        dob: '',
        gender: 'L',
        contact_number: '',
        address: '',
        medical_history: 'Normal'
    });

    const [securityForm, setSecurityForm] = useState({
        new_username: '',
        current_password: '',
        new_password: '',
        confirm_password: ''
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // UX Modes
    const [isEditingMedical, setIsEditingMedical] = useState(false);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Modal State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        type: 'identity' | 'medical' | 'username' | 'password' | null;
        title: string;
        message: string;
        action: () => Promise<void>;
        isDestructive?: boolean;
    }>({
        isOpen: false,
        type: null,
        title: '',
        message: '',
        action: async () => {},
        isDestructive: false
    });

    // 2. Helpers

    const getApiUrl = () => {
         if (typeof window !== 'undefined') {
             const win = window as unknown as { __ENV__?: Record<string, string> };
             if (win.__ENV__) return win.__ENV__.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
         }
         return 'http://localhost:8080/api/v1';
    };

    const resetForms = useCallback(() => {
        if (user) {
            setMedicalForm({
                full_name: user.full_name || '',
                nik: user.nik || '',
                pob: user.pob || '',
                dob: user.dob || '',
                gender: user.gender || 'L',
                contact_number: user.contact_number || '',
                address: user.address || '',
                medical_history: user.medical_history || 'Normal'
            });
            setSecurityForm(p => ({ ...p, new_username: user.username, current_password: '', new_password: '', confirm_password: '' }));
            setErrors({});
        }
    }, [user]);

    // Init Effect
    useEffect(() => {
        resetForms();
    }, [user, resetForms]);

    // 3. Validation Logic

    const validateField = useCallback((field: string, value: string) => {
        let error = "";
        switch(field) {
            case 'nik':
                if (value.length > 0 && !/^\d*$/.test(value)) return "Numbers only"; 
                if (value.length > 0 && value.length < 16) return "Must be 16 digits";
                if (value.length > 16) return "Max 16 digits";
                break;
            case 'full_name':
                if (value.length > 0 && value.length < 2) error = "Name too short";
                break;
            case 'pob':
                if (value.length > 0 && value.length < 2) error = "Place of birth too short";
                break;
            case 'dob':
                if (value && new Date(value) > new Date()) error = "Cannot be in future";
                break;
            case 'contact_number':
                if (value && !/^\+?[\d\s\-\(\)]*$/.test(value)) error = "Invalid characters";
                break;
            case 'new_username':
                if (value.length > 0 && value.length < 3) return "Min 3 characters";
                if (value.length > 0 && !/^[a-zA-Z0-9_-]+$/.test(value)) return "Alphanumeric, _ or - only";
                break;
            case 'new_password':
                if (!value) return "";
                if (value.length < 8) return "Min 8 characters";
                if (!/[A-Z]/.test(value)) return "Need 1 uppercase letter";
                if (!/\d/.test(value)) return "Need 1 number";
                if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return "Need 1 symbol";
                break;
            case 'confirm_password':
                if (value && value !== securityForm.new_password) return "Passwords do not match";
                break;
        }
        return error;
    }, [securityForm.new_password]);

    const runFullMedicalValidation = () => {
        const newErrors: Record<string, string> = {};
        const isLocked = user?.is_patient;

        if (!isLocked) {
            if (!/^\d{16}$/.test(medicalForm.nik)) newErrors.nik = "Must be exactly 16 digits";
            if (medicalForm.full_name.length < 2) newErrors.full_name = "Name too short";
            if (!medicalForm.dob) newErrors.dob = "Date of Birth is required";
            else if (new Date(medicalForm.dob) > new Date()) newErrors.dob = "Cannot be in future";
            if (!medicalForm.pob) newErrors.pob = "Place of Birth required";
        }

        if (medicalForm.contact_number && !/^\+?[\d\s\-\(\)]{10,20}$/.test(medicalForm.contact_number)) {
            newErrors.contact_number = "Invalid phone format";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 4. Change Handlers

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

    // 5. API Logic

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleApiError = (err: any, defaultField?: string) => {
        const fieldErrors: Record<string, string> = {};
        if (err.response?.status === 400 || err.response?.status === 422) {
            const detail = err.response.data.detail;
            if (typeof detail === 'string') {
                if (defaultField) fieldErrors[defaultField] = detail;
                else if (detail.toLowerCase().includes('nik')) fieldErrors.nik = detail;
                else toast(detail, "error");
            } else if (Array.isArray(detail)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                detail.forEach((e: any) => {
                    const field = e.loc[e.loc.length - 1];
                    fieldErrors[field] = e.msg;
                });
            }
        } else {
            toast("Failed to connect to server.", "error");
        }
        setErrors(prev => ({ ...prev, ...fieldErrors }));
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    };

    const executeSaveProfile = async () => {
        setLoading(true);
        const API_URL = getApiUrl();
        const token = localStorage.getItem('ecg_token');

        try {
            const res = await axios.put(`${API_URL}/auth/profile`, medicalForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data);
            toast("Profile updated successfully!", "success");
            setIsEditingMedical(false);
            setConfirmState(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
            handleApiError(err);
        } finally {
            setLoading(false);
        }
    };

    const executeChangeUsername = async () => {
        setLoading(true);
        const API_URL = getApiUrl();
        const token = localStorage.getItem('ecg_token');

        try {
            const res = await axios.put(`${API_URL}/auth/change-username`, { new_username: securityForm.new_username }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data);
            toast("Username updated!", "success");
            setIsEditingUsername(false);
            setConfirmState(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
            handleApiError(err, 'new_username');
        } finally {
            setLoading(false);
        }
    };

    const executeChangePassword = async () => {
        setLoading(true);
        const API_URL = getApiUrl();
        const token = localStorage.getItem('ecg_token');

        try {
            await axios.put(`${API_URL}/auth/change-password`, { 
                current_password: securityForm.current_password,
                new_password: securityForm.new_password
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast("Password changed successfully!", "success");
            setSecurityForm(p => ({ ...p, current_password: '', new_password: '', confirm_password: '' }));
            setIsChangingPassword(false);
            setConfirmState(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
            handleApiError(err, 'current_password');
        } finally {
            setLoading(false);
        }
    };

    // 6. Interaction Handlers

    const handleCancelMedical = () => {
        setIsEditingMedical(false);
        if (user?.is_patient) resetForms(); 
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

        if (!user?.is_patient) {
            setConfirmState({
                isOpen: true,
                type: 'identity',
                title: 'Confirm Identity',
                message: 'Once saved, your Name, NIK, Date of Birth, and Gender will be PERMANENTLY locked. Please ensure they match your official ID exactly.',
                action: executeSaveProfile,
                isDestructive: false
            });
        } else {
            setConfirmState({
                isOpen: true,
                type: 'medical',
                title: 'Update Profile',
                message: 'Are you sure you want to update your contact and medical information?',
                action: executeSaveProfile
            });
        }
    };

    const onUpdateUsernameClick = () => {
        if (errors.new_username || securityForm.new_username.length < 3) return;
        setConfirmState({
            isOpen: true,
            type: 'username',
            title: 'Change Username',
            message: `Are you sure you want to change your username to @${securityForm.new_username}?`,
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
            title: 'Change Password',
            message: 'Are you sure you want to update your password? You will need to use the new password next time you login.',
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
