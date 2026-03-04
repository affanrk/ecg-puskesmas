'use client';

import { useState } from 'react';
import {
    Mail,
    ShieldCheck,
    Key,
    CheckCircle2,
    Edit2,
    Save,
    X
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/hooks/useToast';
import axiosInstance from '@/services/axiosInstance';
import { parseApiError } from '@/utils/helpers';
import StandardInput from '@/components/shared/StandardInput';
import ConfirmationModal from '@/components/shared/ConfirmationModal';

export default function AdminProfile() {
    const { user, setUser } = useStore();
    const { show: toast } = useToast();

    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [username, setUsername] = useState(user?.username || '');

    const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);

    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const [confirmAction, setConfirmAction] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        action: () => Promise<void>;
    }>({
        isOpen: false,
        title: '',
        message: '',
        action: async () => { }
    });

    const handleUpdateUsername = async () => {
        if (username === user?.username) {
            setIsEditingUsername(false);
            return;
        }

        setIsUpdatingUsername(true);
        try {

            const res = await axiosInstance.put('/auth/change-username', { new_username: username });
            setUser(res.data);
            toast("Username updated successfully", "success");
            setIsEditingUsername(false);
        } catch (error) {
            const { message } = parseApiError(error as Error);
            toast(message || "Failed to update username", "error");
            setUsername(user?.username || '');
        } finally {
            setIsUpdatingUsername(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!passwords.current || !passwords.new || !passwords.confirm) {
            toast("Please fill in all password fields", "warning");
            return;
        }
        if (passwords.new !== passwords.confirm) {
            toast("New passwords do not match", "error");
            return;
        }
        if (passwords.new.length < 8) {
            toast("Password must be at least 8 characters", "warning");
            return;
        }

        setIsUpdatingPassword(true);
        try {

            await axiosInstance.put('/auth/change-password', {
                current_password: passwords.current,
                new_password: passwords.new
            });
            toast("Password changed successfully", "success");
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (error) {
            const { message } = parseApiError(error as Error);
            toast(message || "Failed to change password", "error");
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 p-6 lg:p-8 gap-6 overflow-hidden animate-in fade-in duration-500">
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 flex flex-col gap-6 min-h-0">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 flex flex-col items-center text-center relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-24 bg-slate-900 z-0" />

                        <div className="relative z-10 mt-4">
                            <div className="w-24 h-24 rounded-2xl bg-rose-600 flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-rose-900/40 ring-4 ring-white">
                                {user?.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-lg border-4 border-white flex items-center justify-center text-white shadow-sm">
                                <CheckCircle2 size={14} />
                            </div>
                        </div>

                        <div className="mt-6 z-10 w-full">
                            <div className="flex flex-col items-center gap-1">
                                {isEditingUsername ? (
                                    <div className="flex items-center gap-2 w-full max-w-[240px]">
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                                            autoFocus
                                        />
                                        <button onClick={handleUpdateUsername} disabled={isUpdatingUsername} className="p-2 bg-emerald-500 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white rounded-md hover:bg-emerald-600 shadow-sm transition-colors">
                                            {isUpdatingUsername ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                                        </button>
                                        <button onClick={() => { setIsEditingUsername(false); setUsername(user?.username || ''); }} className="p-2 bg-slate-100 text-slate-400 rounded-md hover:bg-slate-200 transition-colors">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{user?.username}</h2>
                                        <button onClick={() => setIsEditingUsername(true)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                                            <Edit2 size={14} />
                                        </button>
                                    </div>
                                )}
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">{user?.role}</p>
                            </div>

                            <div className="mt-8 space-y-4 text-left border-t border-slate-50 pt-8">
                                <div className="flex items-center gap-4 text-slate-600">
                                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                                        <Mail size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</p>
                                        <p className="text-sm font-bold text-slate-700 truncate">{user?.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-slate-600">
                                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                                        <ShieldCheck size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Level</p>
                                        <p className="text-sm font-bold text-slate-700">Full System Override</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-7 flex flex-col gap-6 min-h-0">
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
                </div>
            </div>

            <ConfirmationModal
                isOpen={confirmAction.isOpen}
                onClose={() => setConfirmAction({ ...confirmAction, isOpen: false })}
                onConfirm={confirmAction.action}
                title={confirmAction.title}
                message={confirmAction.message}
            />
        </div>
    );
}
