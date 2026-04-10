'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '@/services/axiosInstance';
import { api } from '@/services/api';
import { useStore } from '@/store/useStore';
import StandardInput from '@/components/shared/StandardInput';
import clsx from 'clsx';
import { Key } from 'lucide-react';
import { patterns, validators } from '@/utils/validators';
import { parseApiError } from '@/utils/helpers';
import { useToast } from '@/hooks/useToast';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}


export default function ChangePasswordModal({ isOpen, onClose, onSuccess }: Props) {
    const setUser = useStore(state => state.setUser);
    const { show: toast } = useToast();
    const [error, setError] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [strength, setStrength] = useState({ score: 0, label: '' });
    const [showPwdHint, setShowPwdHint] = useState(false);
    const [checks, setChecks] = useState({ length: false, upper: false, lower: false, number: false, special: false, match: false });

    useEffect(() => {
        const pwd = newPassword || '';
        const newChecks = {
            length: pwd.length >= 8,
            upper: patterns.password.upper.test(pwd),
            lower: patterns.password.lower.test(pwd),
            number: patterns.password.number.test(pwd),
            special: patterns.password.special.test(pwd),
            match: pwd.length > 0 && pwd === confirmPassword,
        };
        setChecks(newChecks);

        const pwdStrengthCount = [newChecks.length, newChecks.upper, newChecks.number, newChecks.special].filter(Boolean).length;
        let label = '';
        if (pwdStrengthCount === 0) label = 'Enter Password';
        else if (pwdStrengthCount <= 2) label = 'Weak';
        else if (pwdStrengthCount === 3) label = 'Good';
        else label = 'Secure';
        setStrength({ score: pwdStrengthCount, label });
    }, [newPassword, confirmPassword]);

    useEffect(() => {
        if (!isOpen) {
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const valid = () => {
        if (!currentPassword) return false;
        if (validators.password(newPassword)) return false;
        if (newPassword !== confirmPassword) return false;
        return true;
    };

    const handleSubmit = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('Please fill in all password fields');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }
        const pwdErr = validators.password(newPassword);
        if (pwdErr) {
            setError(pwdErr);
            return;
        }

        setIsSubmitting(true);
        try {
            await axiosInstance.put('/auth/change-password', {
                current_password: currentPassword,
                new_password: newPassword,
            });

            const token = localStorage.getItem('ecg_token');
            if (token) {
                try {
                    const userData = await api.fetchUserProfile(token);
                    setUser(userData);
                    localStorage.setItem('ecg_user', JSON.stringify(userData));
                } catch (fetchErr) {
                    console.error('Failed to refresh profile after password change', fetchErr);
                }
            }

            toast('Password changed successfully', 'success');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            onSuccess?.();
            onClose();
        } catch (err: unknown) {
            let parsed = parseApiError({});
            if (axios.isAxiosError(err)) {
                parsed = parseApiError(err);
            } else if (err instanceof Error) {
                parsed = parseApiError(err);
            }
            setError(parsed.message || 'Failed to change password');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 p-6 animate-in fade-in duration-300">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-rose-50 rounded-md flex items-center justify-center text-rose-600">
                            <Key size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Change Password</h3>
                            <p className="text-sm text-slate-500 mt-1">Update your password to keep your account secure.</p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 space-y-3">
                    <StandardInput label="Current password" type="password" value={currentPassword} onChange={(e) => { setCurrentPassword(e.target.value); if (error) setError(''); }} placeholder="Enter current password" />
                    <div className="relative">
                        <StandardInput
                            label="New password"
                            type="password"
                            value={newPassword}
                            onChange={(e) => { setNewPassword(e.target.value); if (error) setError(''); }}
                            placeholder="Min. 8 chars"
                            onFocus={() => setShowPwdHint(true)}
                            onBlur={() => setShowPwdHint(false)}
                        />
                        <div className={clsx(
                            "absolute left-0 bottom-[calc(100%+8px)] w-full bg-slate-900 text-white p-3 rounded-xl shadow-2xl transition-all duration-300 z-50 pointer-events-none origin-bottom",
                            showPwdHint ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"
                        )}>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Security Requirements</div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {[
                                    { label: '8+ Chars', met: checks.length },
                                    { label: 'Uppercase', met: checks.upper },
                                    { label: 'Lowercase', met: checks.lower },
                                    { label: 'Number', met: checks.number },
                                    { label: 'Symbol', met: checks.special },
                                    { label: 'Match', met: checks.match }
                                ].map((req, i) => (
                                    <div key={i} className={clsx("flex items-center gap-2 text-[10px] font-bold transition-all", req.met ? "text-emerald-400" : "text-slate-500")}>
                                        {req.met ? <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg> : <div className="w-1 h-1 rounded-full bg-slate-600 ml-1 mr-0.5" />}
                                        {req.label}
                                    </div>
                                ))}
                            </div>
                            <div className="absolute -bottom-1.5 left-8 w-3 h-3 bg-slate-900 rotate-45"></div>
                        </div>
                    </div>

                    <div>
                        <StandardInput label="Confirm new password" type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(''); }} placeholder="Repeat new password" />
                        
                        {confirmPassword && newPassword !== confirmPassword ? (
                            <p className="text-xs text-rose-600 font-bold mt-1">Passwords do not match</p>
                        ) : null}
                        {error ? <p className="text-xs text-rose-600 font-bold mt-1">{error}</p> : null}
                    </div>


                    <div className="flex gap-1 h-1 mt-1.5 px-1">
                        {[1, 2, 3, 4].map((step) => (
                            <div
                                key={step}
                                className={clsx(
                                    "h-full flex-1 rounded-full transition-all duration-500 ease-out",
                                    strength.score >= step
                                        ? (strength.score <= 2 ? "bg-rose-400" : strength.score === 3 ? "bg-amber-400" : "bg-emerald-500")
                                        : "bg-slate-100"
                                )}
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-6">
                    <div>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!valid() || isSubmitting}
                            className={clsx(
                                "w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3",
                                (isSubmitting || !valid()) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                            )}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin cursor-not-allowed" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Key size={14} /> Update Credentials
                                </>
                            )}
                        </button>
                    </div>

                    <div className="mt-3 flex">
                        <button
                            type="button"
                            onClick={() => { setError(''); onClose(); }}
                            className="flex-1 py-3 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
