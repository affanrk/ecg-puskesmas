import { Key } from 'lucide-react';
import StandardInput from '@/components/shared/StandardInput';

interface PasswordState {
    current: string;
    new: string;
    confirm: string;
}

interface SecurityCredentialsFormProps {
    passwords: PasswordState;
    setPasswords: (passwords: PasswordState) => void;
    handleUpdatePassword: () => void;
    isUpdatingPassword: boolean;
}

export function SecurityCredentialsForm({
    passwords,
    setPasswords,
    handleUpdatePassword,
    isUpdatingPassword
}: SecurityCredentialsFormProps) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col min-h-0 overflow-hidden">
            <div className="p-5 border-b border-slate-50 flex items-center gap-3 bg-white shrink-0">
                <Key size={18} className="text-slate-400" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Security Credentials</h3>
            </div>
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                <form onSubmit={(e) => { e.preventDefault(); handleUpdatePassword(); }} className="space-y-4 max-w-md mx-auto">
                    <StandardInput
                        label="Current Password"
                        type="password"
                        value={passwords.current}
                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                        placeholder="Enter current password"
                    />
                    <div className="h-px bg-slate-50 w-full my-2" />
                    <StandardInput
                        label="New Password"
                        type="password"
                        value={passwords.new}
                        onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                        placeholder="Minimum 8 characters"
                    />
                    <StandardInput
                        label="Confirm New Password"
                        type="password"
                        value={passwords.confirm}
                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                        placeholder="Re-enter new password"
                    />
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isUpdatingPassword}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer"
                        >
                            {isUpdatingPassword ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Key size={14} /> Update Credentials
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
