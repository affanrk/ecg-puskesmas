'use client';

import { Shield, Edit2, CheckCircle2 } from 'lucide-react';
import StandardInput from '@/components/shared/StandardInput';

interface UsernameCardProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: any;
    isEditingUsername: boolean;
    setIsEditingUsername: (val: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    securityForm: any;
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
        <div className="bg-white p-6 lg:p-8 rounded-xl border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] flex flex-col h-[480px] w-full overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6 shrink-0">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Shield size={18} />
                    </div>
                    <span>Username Identity</span>
                </h2>
                {!isEditingUsername && (
                    <button
                        onClick={() => setIsEditingUsername(true)}
                        className="text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200"
                    >
                        <Edit2 size={14} />
                        <span>Change</span>
                    </button>
                )}
            </div>

            <div className="flex-1 flex flex-col min-h-0 w-full">
                {isEditingUsername ? (
                    <div className="flex-1 flex flex-col w-full animate-in fade-in duration-200">
                        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                            <StandardInput
                                label="Current Username"
                                value={user.username}
                                onChange={() => { }}
                                disabled={true}
                            />

                            <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 text-[11px] text-blue-700">
                                <p className="font-semibold mb-0.5">Note:</p>
                                Changing your username will affect your login credentials.
                            </div>

                            <StandardInput
                                label="New Username"
                                value={securityForm.new_username}
                                onChange={(e: any) => handleSecurityChange('new_username', e.target.value)}
                                placeholder="Enter new username"
                                errorMessage={errors.new_username}
                            />
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-50 mt-4 shrink-0">
                            <button
                                onClick={handleCancelUsername}
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onUpdateUsernameClick}
                                disabled={loading || securityForm.new_username === user.username}
                                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={14} /> Update Username
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col w-full animate-in fade-in duration-200">
                        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 w-full">
                            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-blue-500 ring-1 ring-blue-100">
                                <Shield size={32} strokeWidth={1.5} />
                            </div>
                            <p className="text-slate-900 text-sm font-bold mb-1">Username Identity</p>
                            <p className="text-slate-500 text-xs text-center max-w-[240px]">
                                Your current username is <span className="font-bold text-slate-700">@{user.username}</span>. You can change it at any time.
                            </p>
                        </div>

                        {/* Invisible spacer to match button height */}
                        <div className="h-[52px] shrink-0"></div>
                    </div>
                )}
            </div>
        </div>
    );
}