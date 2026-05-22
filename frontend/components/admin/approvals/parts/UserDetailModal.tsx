'use client';

import clsx from 'clsx';
import {
    X,
    UserCheck,
    Mail,
    Calendar,
    MapPin,
    Briefcase,
    Info,
    HeartPulse,
    BadgeCheck
} from 'lucide-react';

import { User } from '@/types/user';
import { getActiveProfile, formatDate, calculateAge } from '@/utils/helpers';

interface UserDetailModalProps {
    user: User;
    onClose: () => void;
    onApprove: (id: string, name: string) => void;
    onReject: (id: string, name: string) => void;
}

function DetailRow({ label, value }: { label: string, value?: string }) {
    return (
        <div className="flex flex-col gap-0.5 border-b border-slate-50 pb-2">
            <span className="text-[9px] font-black text-slate-400 uppercase">{label}</span>
            <span className="text-xs font-bold text-slate-700 truncate">{value || '---'}</span>
        </div>
    );
}

function DetailGroup({ title, icon, color = "slate", children }: { title: string, icon: React.ReactNode, color?: string, children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className={clsx(
                    "p-1.5 rounded-lg",
                    color === 'rose' ? "bg-rose-50 text-rose-500" :
                        color === 'teal' ? "bg-teal-50 text-teal-500" :
                            color === 'blue' ? "bg-blue-50 text-blue-500" :
                                "bg-slate-100 text-slate-400"
                )}>
                    {icon}
                </div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h3>
            </div>
            <div className="space-y-3 pl-1">
                {children}
            </div>
        </div>
    );
}

export default function UserDetailModal({ user, onClose, onApprove, onReject }: UserDetailModalProps) {
    const profile = getActiveProfile(user);
    const age = calculateAge((profile?.dob || ""));

    const isPatient = user.is_patient;
    const isOperator = user.is_operator;
    const isDoctor = user.is_doctor;

    return (
        <div className="absolute inset-0 z-[100] flex justify-end overflow-hidden pointer-events-none">
            <div
                className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] pointer-events-auto animate-in fade-in duration-300"
                onClick={onClose}
            />
            <div className="relative w-full max-w-[420px] bg-white shadow-[-12px_0_40px_rgba(0,0,0,0.08)] border-l border-slate-100 flex flex-col h-full pointer-events-auto animate-in slide-in-from-right duration-400 ease-out">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={clsx(
                            "w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg",
                            isDoctor ? "bg-blue-500 shadow-blue-500/20" :
                                isOperator ? "bg-teal-500 shadow-teal-500/20" :
                                    "bg-rose-500 shadow-rose-500/20"
                        )}>
                            {user.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-800 tracking-tight leading-tight">
                                {(profile?.full_name || "") || user.username}
                            </h2>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {isDoctor ? 'Reviewing Doctor Application' : isOperator ? 'Reviewing Operator Application' : 'Reviewing Patient Application'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 border border-rose-100 hover:border-rose-200 transition-all cursor-pointer"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                    <div className="bg-slate-900 rounded-2xl p-4 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">National Identity (NIK)</span>
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded uppercase">Age: {age || '--'}</span>
                                <span className="text-[9px] font-black bg-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase">{(profile?.gender || "") || '---'}</span>
                            </div>
                        </div>
                        <p className="text-xl font-mono font-black tracking-[0.15em] text-white">
                            {(profile?.nik || "") || '--- --- ---'}
                        </p>
                    </div>

                    <div className="space-y-6">
                        <DetailGroup title="Communications" icon={<Mail size={12} />}>
                            <DetailRow label="Email Address" value={user.email} />
                            <DetailRow label="Phone Number" value={(profile?.contact_number || "")} />
                        </DetailGroup>

                        <DetailGroup title="Demographics & Registration" icon={<Calendar size={12} />}>
                            <div className="grid grid-cols-2 gap-4 pb-2">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Place of Birth</p>
                                    <p className="text-xs font-bold text-slate-700">{(profile?.pob || "") || '---'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Date of Birth</p>
                                    <p className="text-xs font-bold text-slate-700">{(profile?.dob || "") || '---'}</p>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-slate-50">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Residential Address</p>
                                <div className="flex gap-2">
                                    <MapPin size={12} className="text-slate-300 shrink-0 mt-0.5" />
                                    <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                                        {(profile?.address || "") || "No residential address provided."}
                                    </p>
                                </div>
                            </div>
                        </DetailGroup>

                        {isPatient && (
                            <DetailGroup title="Medical Background" icon={<HeartPulse size={12} />} color="rose">
                                <div className="bg-rose-50/30 rounded-xl p-4 border border-rose-100/50">
                                    <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                                        {(profile?.medical_history || "") || "The patient has formally declared no significant prior medical history during the registration process."}
                                    </p>
                                </div>
                            </DetailGroup>
                        )}

                        {isOperator && (
                            <DetailGroup title="Professional Details" icon={<Briefcase size={12} />} color="teal">
                                <DetailRow label="STR Number" value={(profile?.str_number || "") || undefined} />
                                <DetailRow label="Operator Role" value={(profile?.operator_role || "") || undefined} />
                            </DetailGroup>
                        )}

                        {isDoctor && (
                            <DetailGroup title="Clinical Credentials" icon={<BadgeCheck size={12} />} color="blue">
                                <DetailRow label="STR Number" value={(profile?.str_number || "") || undefined} />
                                <DetailRow label="SIP Number" value={(profile?.sip_number || "") || undefined} />
                                <DetailRow label="Medical Specialty" value={(profile?.specialty || "") || undefined} />
                            </DetailGroup>
                        )}

                        <div className="flex items-center gap-2 px-1 py-2 bg-slate-50 rounded-lg border border-slate-100">
                            <Info size={14} className="text-amber-500 shrink-0" />
                            <p className="text-[10px] font-bold text-slate-400 italic">
                                {isDoctor ? 'Doctor' : isOperator ? 'Operator' : 'Patient'} registered on {formatDate(user.created_dt as string)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white border-t border-slate-100 space-y-3 shrink-0">
                    <button
                        onClick={() => {
                            if (user.id) onApprove(user.id, (profile?.full_name || "") || user.username);
                        }}
                        className={clsx(
                            "w-full py-4 text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg cursor-pointer",
                            isDoctor ? "bg-slate-900 hover:bg-emerald-600 shadow-slate-900/10" :
                                isOperator ? "bg-slate-900 hover:bg-emerald-600 shadow-slate-900/10" :
                                    "bg-slate-900 hover:bg-emerald-600 shadow-slate-900/10"
                        )}
                    >
                        <UserCheck size={16} />
                        {isDoctor ? 'Approve Doctor Access' : isOperator ? 'Approve Operator Access' : 'Approve Patient Access'}
                    </button>
                    <button
                        onClick={() => {
                            if (user.id) onReject(user.id, (profile?.full_name || "") || user.username);
                        }}
                        className="w-full py-3 text-slate-400 hover:text-rose-600 transition-colors text-[10px] font-black uppercase tracking-[0.2em] cursor-pointer"
                    >
                        Reject Profile
                    </button>
                </div>
            </div>
        </div>
    );
}