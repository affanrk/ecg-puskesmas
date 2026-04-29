import { Edit2, Save, X, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { User } from '@/types/user';

interface AdminProfileCardProps {
    user: User | null;
    isEditingUsername: boolean;
    setIsEditingUsername: (editing: boolean) => void;
    username: string;
    setUsername: (username: string) => void;
    handleUpdateUsername: () => void;
    isUpdatingUsername: boolean;
}

export function AdminProfileCard({
    user,
    isEditingUsername,
    setIsEditingUsername,
    username,
    setUsername,
    handleUpdateUsername,
    isUpdatingUsername
}: AdminProfileCardProps) {
    return (
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
                            <button onClick={handleUpdateUsername} disabled={isUpdatingUsername} className="p-2 bg-emerald-500 disabled:bg-emerald-300 disabled:cursor-not-allowed text-white rounded-md hover:bg-emerald-600 shadow-sm transition-colors cursor-pointer">
                                {isUpdatingUsername ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                            </button>
                            <button onClick={() => { setIsEditingUsername(false); setUsername(user?.username || ''); }} className="p-2 bg-slate-100 text-slate-400 rounded-md hover:bg-slate-200 transition-colors cursor-pointer">
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{user?.username}</h2>
                            <button onClick={() => setIsEditingUsername(true)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors cursor-pointer">
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
    );
}
