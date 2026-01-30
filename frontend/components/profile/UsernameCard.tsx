'use client';

import { ChangeEvent } from 'react';
import { Shield, Edit2, CheckCircle2, UserCircle2 } from 'lucide-react';
import StandardInput from '@/components/shared/StandardInput';
import { User } from '@/store/useStore';

interface SecurityForm {
    new_username: string;
    current_password: string;
    new_password: string;
    confirm_password: string;
}

interface UsernameCardProps {
    user: User;
    isEditingUsername: boolean;
    setIsEditingUsername: (val: boolean) => void;
    securityForm: SecurityForm;
    handleSecurityChange: (field: string, value: string) => void;
    errors: Record<string, string>;
    handleCancelUsername: () => void;
    onUpdateUsernameClick: () => void;
    loading: boolean;
}

export default function UsernameCard({
    user,
    isEditingUsername,
    setIsEditingUsername,
    securityForm,
    handleSecurityChange,
    errors,
    handleCancelUsername,
    onUpdateUsernameClick,
    loading
}: UsernameCardProps) {
    return (
        <div className="bg-white p-6 lg:p-8 rounded-xl border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] flex flex-col h-full w-full overflow-hidden transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)] duration-500 relative group">
            
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-blue-900 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <UserCircle2 size={120} strokeWidth={1} />
            </div>

            <div className="flex items-center justify-between border-b border-slate-50 pb-4 mb-6 relative z-10 shrink-0">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-md flex items-center justify-center shadow-sm border border-blue-100/50">
                        <Shield size={20} strokeWidth={2} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Username</h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">System Identifier</p>
                    </div>
                </div>

                {!isEditingUsername && (
                    <button
                        onClick={() => setIsEditingUsername(true)}
                        className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-4 py-2.5 rounded-md flex items-center gap-2 transition-all duration-300 border border-slate-100 hover:border-blue-200"
                    >
                        <Edit2 size={12} strokeWidth={3} /> Change
                    </button>
                )}
            </div>

            <div className="flex-1 flex flex-col min-h-0 w-full relative z-10">
                {isEditingUsername ? (
                    <div className="flex-1 flex flex-col w-full animate-in fade-in duration-300">
                        <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                            <StandardInput
                                label="Current Username"
                                value={user.username}
                                onChange={() => { }}
                                disabled={true}
                            />

                            <div className="p-5 bg-blue-50/50 rounded-lg border border-blue-100 text-[11px] text-blue-700 flex gap-4 leading-relaxed">
                                <div className="shrink-0 mt-1 w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                <div>
                                    <p className="font-black uppercase tracking-wider mb-1">Attention:</p>
                                    Modifying your username will update your login credentials immediately. Ensure your new username is memorable.
                                </div>
                            </div>

                            <StandardInput
                                label="New Username"
                                value={securityForm.new_username}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => handleSecurityChange('new_username', e.target.value)}
                                placeholder="Enter new username"
                                errorMessage={errors.new_username}
                            />
                        </div>

                        <div className="flex gap-4 pt-8 border-t border-slate-50 mt-8 shrink-0">
                            <button
                                onClick={handleCancelUsername}
                                className="flex-1 px-4 py-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest rounded-md transition-all active:scale-[0.98]"
                            >
                                Discard
                            </button>
                            <button
                                onClick={onUpdateUsernameClick}
                                disabled={loading || securityForm.new_username === user.username}
                                className="flex-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-md shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 hover:-translate-y-0.5"
                            >
                                <CheckCircle2 size={18} strokeWidth={2.5} /> Update Username
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center animate-in fade-in duration-500">
                        <div className="w-full flex flex-col items-center justify-center p-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 min-h-[240px] group/box hover:bg-white hover:border-blue-200 transition-all duration-500">
                            <div className="w-20 h-20 bg-white rounded-md shadow-md flex items-center justify-center mb-6 text-blue-500 ring-1 ring-blue-100 group-hover/box:scale-110 transition-transform duration-500">
                                <Shield size={36} strokeWidth={1.5} />
                            </div>
                            <p className="text-slate-900 text-base font-black tracking-tight mb-2 uppercase tracking-widest text-xs">Primary Identifier</p>
                            <div className="bg-white px-6 py-2.5 rounded-full border border-slate-100 shadow-sm mb-4">
                                <span className="font-black text-blue-600 text-lg">@{user.username}</span>
                            </div>
                            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest text-center max-w-[200px] leading-relaxed">
                                Standard Security Verified
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
