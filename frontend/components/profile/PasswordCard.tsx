'use client';

import { FormEvent } from 'react';
import { Key, Shield, Edit2, Lock } from 'lucide-react';
import StandardInput from '@/components/shared/StandardInput';

interface PasswordCardProps {
    isChangingPassword: boolean;
    setIsChangingPassword: (val: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    securityForm: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setSecurityForm: (val: any) => void;
    handleSecurityChange: (field: string, value: string) => void;
    errors: Record<string, string>;
    handleCancelPassword: () => void;
    handleChangePassword: (e: FormEvent) => void;
    onUpdatePasswordClick: () => void;
    loading: boolean;
}

export default function PasswordCard({
    isChangingPassword,
    setIsChangingPassword,
    securityForm,
    setSecurityForm,
    handleSecurityChange,
    errors,
    handleCancelPassword,
    handleChangePassword,
    onUpdatePasswordClick,
    loading
}: PasswordCardProps) {
    return (
        <div className="bg-white p-6 lg:p-8 rounded-xl border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] flex flex-col h-[480px] w-full overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6 shrink-0">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                        <Key size={18} />
                    </div>
                    <span>Password Security</span>
                </h2>
                {!isChangingPassword && (
                    <button
                        onClick={() => setIsChangingPassword(true)}
                        className="text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200"
                    >
                        <Edit2 size={14} />
                        <span>Change</span>
                    </button>
                )}
            </div>

            <div className="flex-1 flex flex-col min-h-0 w-full">
                {!isChangingPassword ? (
                    <div className="flex-1 flex flex-col w-full animate-in fade-in duration-200">
                        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 w-full">
                            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-emerald-500 ring-1 ring-emerald-100">
                                <Shield size={32} strokeWidth={1.5} />
                            </div>
                            <p className="text-slate-900 text-sm font-bold mb-1">Password Protected</p>
                            <p className="text-slate-500 text-xs text-center max-w-[240px]">
                                Your account is secured with a strong password. No actions required.
                            </p>
                        </div>

                        {/* Invisible spacer to match button height */}
                        <div className="h-[52px] shrink-0"></div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col w-full animate-in fade-in duration-200">
                        <div className="space-y-5 flex-1 overflow-y-auto pr-1">
                            <StandardInput
                                label="Current Password"
                                type="password"
                                value={securityForm.current_password}
                                onChange={(e: any) => setSecurityForm((p: any) => ({ ...p, current_password: e.target.value }))}
                                placeholder="Enter current password"
                                errorMessage={errors.current_password}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <StandardInput
                                    label="New Password"
                                    type="password"
                                    value={securityForm.new_password}
                                    onChange={(e: any) => handleSecurityChange('new_password', e.target.value)}
                                    placeholder="Min. 8 chars"
                                    errorMessage={errors.new_password}
                                />
                                <StandardInput
                                    label="Confirm Password"
                                    type="password"
                                    value={securityForm.confirm_password}
                                    onChange={(e: any) => handleSecurityChange('confirm_password', e.target.value)}
                                    placeholder="Re-enter new password"
                                    errorMessage={errors.confirm_password}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-50 mt-4 shrink-0">
                            <button
                                type="button"
                                onClick={handleCancelPassword}
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onUpdatePasswordClick}
                                disabled={loading}
                                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-200 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm shadow-rose-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <Lock size={14} /> Update Password
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}