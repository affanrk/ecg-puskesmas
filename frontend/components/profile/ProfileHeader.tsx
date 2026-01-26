'use client';

import clsx from 'clsx';
import { ShieldCheck, AlertCircle, Activity, Settings2 } from 'lucide-react';
import { User } from '@/store/useStore';

interface ProfileHeaderProps {
    user: User | null;
    isLocked: boolean;
    activeTab: 'medical' | 'security';
    setActiveTab: (tab: 'medical' | 'security') => void;
}

export default function ProfileHeader({ user, isLocked, activeTab, setActiveTab }: ProfileHeaderProps) {
    if (!user) return null;

    return (
        <div className="bg-white p-8 rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
            {/* Decorative Background Element */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-teal-50 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60 pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>

            <div className="flex items-center gap-8 w-full md:w-auto relative z-10">
                <div className="relative shrink-0">
                    <div className="w-24 h-24 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-teal-500/20 text-4xl font-black ring-8 ring-slate-50">
                        {user.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div className={clsx(
                        "absolute -bottom-2 -right-2 w-10 h-10 rounded-xl flex items-center justify-center border-4 border-white shadow-lg animate-in zoom-in duration-300",
                        isLocked ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                    )}>
                        {isLocked ? <ShieldCheck size={18} strokeWidth={3} /> : <AlertCircle size={18} strokeWidth={3} />}
                    </div>
                </div>
                
                <div className="space-y-2 text-center md:text-left">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">{user.full_name || user.username}</h1>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                            NIK: {user.nik || "---"}
                        </div>
                        <span className={clsx("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 shadow-sm", isLocked ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100")}>
                            {isLocked ? "Verified Patient" : "Profile Incomplete"}
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200 w-full md:w-auto relative z-10 backdrop-blur-sm flex shadow-inner">
                <button 
                    onClick={() => setActiveTab('medical')} 
                    className={clsx(
                        "flex-1 md:flex-none px-6 py-3.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2.5 min-w-[160px]", 
                        activeTab === 'medical' 
                            ? "bg-white text-teal-700 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.05)] ring-1 ring-black/5" 
                            : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                    )}
                >
                    <Activity size={16} strokeWidth={2.5} className={activeTab === 'medical' ? "text-teal-500" : "opacity-50"} />
                    Medical Profile
                </button>
                <button 
                    onClick={() => setActiveTab('security')} 
                    className={clsx(
                        "flex-1 md:flex-none px-6 py-3.5 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2.5 min-w-[160px]", 
                        activeTab === 'security' 
                            ? "bg-white text-blue-700 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.05)] ring-1 ring-black/5" 
                            : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
                    )}
                >
                    <Settings2 size={16} strokeWidth={2.5} className={activeTab === 'security' ? "text-blue-500" : "opacity-50"} />
                    Security Settings
                </button>
            </div>
        </div>
    );
}