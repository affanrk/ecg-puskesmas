'use client';

import { User } from '@/store/useStore';
import { 
    X, 
    UserCheck, 
    Mail, 
    Calendar, 
    MapPin, 
    Stethoscope, 
    Info
} from 'lucide-react';
import { formatDate, calculateAge } from '@/utils/helpers';
import clsx from 'clsx';

interface UserDetailModalProps {
    user: User;
    onClose: () => void;
    onApprove: (id: number, name: string) => void;
    onReject: (id: number, name: string) => void;
}

export default function UserDetailModal({ user, onClose, onApprove, onReject }: UserDetailModalProps) {
    const age = calculateAge(user.dob);

    return (
        <div className="absolute inset-0 z-[100] flex justify-end overflow-hidden pointer-events-none">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] pointer-events-auto animate-in fade-in duration-300" 
                onClick={onClose} 
            />
            
            {/* Side Panel: Optimized for 1080p without scrolling */}
            <div className="relative w-full max-w-[420px] bg-white shadow-[-12px_0_40px_rgba(0,0,0,0.08)] border-l border-slate-100 flex flex-col h-full pointer-events-auto animate-in slide-in-from-right duration-400 ease-out">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-500 rounded-lg flex items-center justify-center text-white font-black text-lg shadow-lg shadow-rose-500/20">
                            {user.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-800 tracking-tight leading-tight">
                                {user.full_name || user.username}
                            </h2>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Reviewing Application</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content: Balanced Spacing */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                    
                    {/* Identity & Basic Stats: Ultra Compact */}
                    <div className="bg-slate-900 rounded-2xl p-4 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">National Identity (NIK)</span>
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded uppercase">Age: {age || '--'}</span>
                                <span className="text-[9px] font-black bg-slate-700 text-slate-300 px-2 py-0.5 rounded uppercase">{user.gender || '---'}</span>
                            </div>
                        </div>
                        <p className="text-xl font-mono font-black tracking-[0.15em] text-white">
                            {user.nik || '--- --- ---'}
                        </p>
                    </div>

                    {/* Information Sections with Larger Text */}
                    <div className="space-y-6">
                        <DetailGroup title="Communications" icon={<Mail size={12} />}>
                            <DetailRow label="Email Address" value={user.email} />
                            <DetailRow label="Phone Number" value={user.contact_number} />
                        </DetailGroup>

                        <DetailGroup title="Demographics & Registration" icon={<Calendar size={12} />}>
                            <div className="grid grid-cols-2 gap-4 pb-2">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Place of Birth</p>
                                    <p className="text-xs font-bold text-slate-700">{user.pob || '---'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-0.5">Date of Birth</p>
                                    <p className="text-xs font-bold text-slate-700">{user.dob || '---'}</p>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-slate-50">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">Residential Address</p>
                                <div className="flex gap-2">
                                    <MapPin size={12} className="text-slate-300 shrink-0 mt-0.5" />
                                    <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                                        {user.address || "No residential address provided."}
                                    </p>
                                </div>
                            </div>
                        </DetailGroup>

                        <DetailGroup title="Medical Background" icon={<Stethoscope size={12} />} color="rose">
                            <div className="bg-rose-50/30 rounded-xl p-4 border border-rose-100/50">
                                <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                                    {user.medical_history || "The patient has formally declared no significant prior medical history during the registration process."}
                                </p>
                            </div>
                        </DetailGroup>

                        <div className="flex items-center gap-2 px-1 py-2 bg-slate-50 rounded-lg border border-slate-100">
                            <Info size={14} className="text-amber-500 shrink-0" />
                            <p className="text-[10px] font-bold text-slate-400 italic">
                                Registered on {formatDate(user.created_dt as string)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-white border-t border-slate-100 space-y-3 shrink-0">
                    <button 
                        onClick={() => {
                            if (user.id) onApprove(user.id, user.full_name || user.username);
                        }}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10"
                    >
                        <UserCheck size={16} /> Approve Access
                    </button>
                    <button 
                        onClick={() => {
                            if (user.id) onReject(user.id, user.full_name || user.username);
                        }}
                        className="w-full py-3 text-slate-400 hover:text-rose-600 transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
                    >
                        Reject Profile
                    </button>
                </div>
            </div>
        </div>
    );
}

function DetailGroup({ title, icon, color = "slate", children }: { title: string, icon: React.ReactNode, color?: string, children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className={clsx("p-1.5 rounded-lg", color === 'rose' ? "bg-rose-50 text-rose-500" : "bg-slate-100 text-slate-400")}>
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

function DetailRow({ label, value }: { label: string, value?: string }) {
    return (
        <div className="flex flex-col gap-0.5 border-b border-slate-50 pb-2">
            <span className="text-[9px] font-black text-slate-400 uppercase">{label}</span>
            <span className="text-xs font-bold text-slate-700 truncate">{value || '---'}</span>
        </div>
    );
}
