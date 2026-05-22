'use client';

import clsx from 'clsx';
import { ShieldCheck, AlertCircle, Settings2, Clock, Briefcase } from 'lucide-react';
import { User } from '@/types/user';
import { getActiveProfile } from '@/utils/helpers';

interface OperatorProfileHeaderProps {
    user: User | null;
    isLocked: boolean;
    activeTab: 'medical' | 'security';
    setActiveTab: (tab: 'medical' | 'security') => void;
}

export default function OperatorProfileHeader({ user, isLocked, activeTab, setActiveTab }: OperatorProfileHeaderProps) {
    if (!user) return null;

    const isApproved = user.is_activated === 1;
    const isActivated = isLocked && isApproved;
    const hasRejection = !!user.rejection_reason && !isApproved;
    const operatorRole = getActiveProfile(user)?.operator_role;

    return (
        <div className="bg-white p-4 lg:p-5 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-50 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60 pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
            <div className="flex items-center gap-6 w-full md:w-auto relative z-10">
                <div className="relative shrink-0">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-xl shadow-amber-500/20 text-3xl font-black ring-4 ring-slate-50">
                        {user.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div className={clsx(
                        "absolute -bottom-1 -right-1 w-8 h-8 rounded-md flex items-center justify-center border-2 border-white shadow-lg animate-in zoom-in duration-300",
                        isActivated ? "bg-emerald-500 text-white" : (hasRejection ? "bg-rose-500 text-white" : (isLocked ? "bg-amber-500 text-white" : "bg-slate-400 text-white"))
                    )}>
                        {isActivated ? <ShieldCheck size={14} strokeWidth={3} /> : (hasRejection ? <AlertCircle size={14} strokeWidth={3} /> : (isLocked ? <Clock size={14} strokeWidth={3} /> : <AlertCircle size={14} strokeWidth={3} />))}
                    </div>
                </div>
                <div className="space-y-1.5 text-center md:text-left">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{(getActiveProfile(user)?.full_name || "") || user.username}</h1>
                    </div>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-0.5">
                        {operatorRole && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-600 text-[9px] font-bold uppercase tracking-wider border border-amber-100">
                                <Briefcase size={10} strokeWidth={2.5} />
                                {operatorRole}
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-wider border border-slate-200">
                            NIK: {(getActiveProfile(user)?.nik || "") || "---"}
                        </div>
                        <span className={clsx("px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border flex items-center gap-1.5 shadow-sm", 
                            isActivated ? "bg-emerald-50 text-emerald-700 border-emerald-100" : 
                            (hasRejection ? "bg-rose-50 text-rose-700 border-rose-100" : (isLocked ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-slate-50 text-slate-500 border-slate-200"))
                        )}>
                            {isActivated ? "Verified Operator" : (hasRejection ? "Profile Rejected" : (isLocked ? "Awaiting Approval" : "Profile Incomplete"))}
                        </span>
                    </div>
                </div>
            </div>
            <div className="p-1 bg-slate-100/80 rounded-lg w-full md:w-auto relative z-10 backdrop-blur-sm flex gap-1">
                <div 
                    className={clsx(
                        "absolute top-1 bottom-1 w-[calc(50%-6px)] bg-white rounded-md transition-all duration-300 ease-out z-0",
                        activeTab === 'medical' ? "left-1" : "left-[calc(50%+2px)]"
                    )}
                />
                <button 
                    onClick={() => setActiveTab('medical')} 
                    className={clsx(
                        "relative z-10 flex-1 md:flex-none px-5 py-3 rounded-md text-[11px] font-bold transition-all duration-300 flex items-center justify-center gap-2 min-w-[140px] cursor-pointer", 
                        activeTab === 'medical' 
                            ? "text-amber-700" 
                            : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <Briefcase size={14} strokeWidth={2.5} className={activeTab === 'medical' ? "text-amber-500" : "opacity-50"} />
                    Professional Profile
                </button>
                <button 
                    onClick={() => setActiveTab('security')} 
                    className={clsx(
                        "relative z-10 flex-1 md:flex-none px-5 py-3 rounded-md text-[11px] font-bold transition-all duration-300 flex items-center justify-center gap-2 min-w-[140px] cursor-pointer", 
                        activeTab === 'security' 
                            ? "text-blue-700" 
                            : "text-slate-400 hover:text-slate-600"
                    )}
                >
                    <Settings2 size={14} strokeWidth={2.5} className={activeTab === 'security' ? "text-blue-500" : "opacity-50"} />
                    Security Settings
                </button>
            </div>
        </div>
    );
}
