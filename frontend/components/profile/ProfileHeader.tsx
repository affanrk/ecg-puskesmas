'use client';

import clsx from 'clsx';
import { ShieldCheck, AlertCircle } from 'lucide-react';

interface ProfileHeaderProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: any;
    isLocked: boolean;
    activeTab: 'medical' | 'security';
    setActiveTab: (tab: 'medical' | 'security') => void;
}

export default function ProfileHeader({ user, isLocked, activeTab, setActiveTab }: ProfileHeaderProps) {
    if (!user) return null;

    return (
        <div className="bg-white px-6 py-5 rounded-xl border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 w-full md:w-auto">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 text-xl font-bold ring-4 ring-white">
                    {user.username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800 tracking-tight">{user.full_name || user.username}</h1>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className={clsx("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5", isLocked ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100")}>
                            {isLocked ? (
                                <><ShieldCheck size={12} /> Verified Patient</>
                            ) : (
                                <><AlertCircle size={12} /> Profile Incomplete</>
                            )}
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 w-full md:w-auto">
                <button 
                    onClick={() => setActiveTab('medical')} 
                    className={clsx("flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-bold transition-all duration-200", activeTab === 'medical' ? "bg-white text-blue-700 shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50")}
                >
                    Medical Profile
                </button>
                <button 
                    onClick={() => setActiveTab('security')} 
                    className={clsx("flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-bold transition-all duration-200", activeTab === 'security' ? "bg-white text-blue-700 shadow-sm ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/50")}
                >
                    Security Settings
                </button>
            </div>
        </div>
    );
}
