'use client';

import { FormEvent, ChangeEvent } from 'react';
import { Key, Edit2, Lock, KeyRound, ShieldCheck } from 'lucide-react';
import StandardInput from '@/components/shared/StandardInput';

interface SecurityForm {
    new_username: string;
    current_password: string;
    new_password: string;
    confirm_password: string;
}

interface PasswordCardProps {
    isChangingPassword: boolean;
    setIsChangingPassword: (val: boolean) => void;
    securityForm: SecurityForm;
    setSecurityForm: React.Dispatch<React.SetStateAction<SecurityForm>>;
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
    onUpdatePasswordClick,
    loading
}: PasswordCardProps) {
    return (
        <div className="bg-white p-6 lg:p-8 rounded-xl border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] flex flex-col h-full w-full overflow-hidden transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] duration-500 relative group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-rose-900 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <KeyRound size={120} strokeWidth={1} />
            </div>

            <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-6 relative z-10 shrink-0">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-md flex items-center justify-center shadow-sm border border-rose-100/50">
                        <Lock size={20} strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Security Access</h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Password Protection</p>
                    </div>
                </div>

                {!isChangingPassword && (
                    <button
                        onClick={() => setIsChangingPassword(true)}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-4 py-2.5 rounded-md flex items-center gap-2 transition-all duration-300 border border-slate-100 hover:border-rose-200"
                    >
                        <Edit2 size={12} strokeWidth={3} /> Change
                    </button>
                )}
            </div>

            <div className="flex-1 flex flex-col min-h-0 w-full relative z-10">
                {!isChangingPassword ? (
                    <div className="flex-1 flex items-center justify-center animate-in fade-in duration-500">
                        <div className="w-full flex flex-col items-center justify-center p-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 min-h-[240px] group/box hover:bg-white hover:border-rose-200 transition-all duration-500">
                            <div className="w-20 h-20 bg-white rounded-md shadow-md flex items-center justify-center mb-6 text-emerald-500 ring-1 ring-emerald-100 group-hover/box:scale-110 transition-transform duration-500">
                                <ShieldCheck size={36} strokeWidth={1.5} />
                            </div>
                            <p className="text-slate-900 text-base font-black tracking-tight mb-2 uppercase tracking-widest text-xs">Encryption Active</p>
                            <p className="text-slate-500 text-[11px] font-bold text-center max-w-[220px] leading-relaxed mb-4">
                                Your account is secured with 256-bit hash encryption.
                            </p>
                            <div className="flex gap-1.5">
                                {[1,2,3,4,5,6].map(i => (
                                    <div key={i} className="w-2 h-2 rounded-full bg-slate-200" />
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col w-full animate-in fade-in duration-300">
                        <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                            <StandardInput
                                label="Current Password"
                                type="password"
                                value={securityForm.current_password}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setSecurityForm((p) => ({ ...p, current_password: e.target.value }))}
                                placeholder="Verify current password"
                                errorMessage={errors.current_password}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 pt-2">
                                <StandardInput
                                    label="New Password"
                                    type="password"
                                    value={securityForm.new_password}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleSecurityChange('new_password', e.target.value)}
                                    placeholder="Min. 8 chars"
                                    errorMessage={errors.new_password}
                                />
                                <StandardInput
                                    label="Confirm Password"
                                    type="password"
                                    value={securityForm.confirm_password}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => handleSecurityChange('confirm_password', e.target.value)}
                                    placeholder="Repeat new password"
                                    errorMessage={errors.confirm_password}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-8 border-t border-slate-50 mt-8 shrink-0">
                            <button
                                type="button"
                                onClick={handleCancelPassword}
                                className="flex-1 px-4 py-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-md transition-all active:scale-[0.98]"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={onUpdatePasswordClick}
                                disabled={loading}
                                className="flex-2 px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-widest rounded-md shadow-xl shadow-rose-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 hover:-translate-y-0.5"
                            >
                                <Key size={18} strokeWidth={2.5} /> Update Password
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}