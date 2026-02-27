'use client';

import { useRouter } from 'next/navigation';
import { Shield, User, Clock, Activity, ArrowRight, Stethoscope, LogOut } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';

export default function OnboardingPage() {
    const router = useRouter();
    const { user } = useStore();
    const { logout } = useAuth();

    if (!user) return null;

    const roles = [
        {
            id: 'patient',
            title: 'Patient',
            description: 'I want to track my ECG recordings, monitor my heart health, and view my medical history.',
            icon: User,
            color: 'text-rose-500',
            bg: 'bg-rose-50',
            border: 'border-rose-200',
            hover: 'hover:border-rose-500 hover:ring-rose-500/20',
            buttonBg: 'bg-rose-500',
            buttonHover: 'group-hover:bg-rose-600',
            action: () => router.push('/onboarding/patient'),
            status: 'Available'
        },
        {
            id: 'operator',
            title: 'Medical Staff',
            description: 'I assist patients in taking ECG recordings at the Puskesmas/Clinic. (Nurse / General Practitioner)',
            icon: Clock,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            hover: 'hover:border-amber-500 hover:ring-amber-500/20',
            buttonBg: 'bg-amber-500',
            buttonHover: 'group-hover:bg-amber-600',
            action: () => router.push('/onboarding/operator'),
            status: 'Available'
        },
        {
            id: 'doctor',
            title: 'Heart Specialist',
            description: 'I review ECG data, provide diagnoses, and monitor remote patients across branches.',
            icon: Stethoscope,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            hover: 'hover:border-emerald-500 hover:ring-emerald-500/20',
            buttonBg: 'bg-emerald-500',
            buttonHover: 'group-hover:bg-emerald-600',
            action: () => router.push('/onboarding/doctor'),
            status: 'Available'
        }
    ];

    return (
        <div className="h-screen bg-slate-50 flex flex-col relative overflow-hidden font-sans">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-brand-900/5 pointer-events-none"></div>
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-400/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <header className="px-4 md:px-8 py-4 md:py-5 relative z-10 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-4 sm:gap-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/20">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-black text-xl text-slate-900 tracking-tight">ECG Platform</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200/60 shadow-sm">
                        <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
                            <User size={14} className="text-brand-600" />
                        </div>
                        <span className="text-xs md:text-sm font-bold text-slate-500 truncate max-w-[150px] md:max-w-none">Welcome, <span className="text-slate-800">{user.username}</span></span>
                    </div>
                    <button 
                        onClick={logout} 
                        className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-full text-sm font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all group"
                        title="Sign Out"
                    >
                        <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform shrink-0" />
                        <span className="hidden sm:inline">Sign Out</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center px-4 md:px-8 relative z-10 min-h-0 overflow-y-auto custom-scrollbar w-full">
                <div className="my-auto w-full max-w-5xl flex flex-col items-center shrink-0 py-4 md:py-6">
                    <div className="text-center max-w-2xl mb-6 md:mb-8 animate-in fade-in zoom-in-95 duration-500">
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">Choose Your Identity</h1>
                        <p className="text-slate-500 text-base md:text-lg leading-relaxed font-medium">
                            Welcome to the platform. To set up your dedicated workspace and tailor your experience, please select the role that best describes you.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {roles.map((role) => {
                        const Icon = role.icon;
                        const isComingSoon = role.status === 'Coming Soon';
                        return (
                            <button
                                key={role.id}
                                onClick={role.action}
                                className={clsx(
                                    "group relative flex flex-col text-left p-6 md:p-8 bg-white rounded-3xl border-2 transition-all duration-300 shadow-xl shadow-slate-200/50",
                                    role.border,
                                    !isComingSoon && role.hover,
                                    isComingSoon && "opacity-80 hover:opacity-100 grayscale-[30%]"
                                )}
                            >
                                {isComingSoon && (
                                    <div className="absolute top-4 right-4 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                        Coming Soon
                                    </div>
                                )}
                                <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-sm transition-transform group-hover:scale-110", role.bg)}>
                                    <Icon className={clsx("w-7 h-7", role.color)} />
                                </div>
                                <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-2">{role.title}</h3>
                                <p className="text-slate-500 font-medium leading-relaxed mb-6 flex-1 text-xs md:text-sm">
                                    {role.description}
                                </p>
                                
                                <div className={clsx(
                                    "mt-auto w-full py-2.5 md:py-3 rounded-xl flex items-center justify-center gap-2 text-white font-black text-xs md:text-sm uppercase tracking-widest transition-all",
                                    isComingSoon ? "bg-slate-300" : role.buttonBg,
                                    !isComingSoon && role.buttonHover
                                )}>
                                    Select Role <ArrowRight size={16} className={clsx("transition-transform", !isComingSoon && "group-hover:translate-x-1")} />
                                </div>
                            </button>
                        );
                    })}
                </div>
                
                <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 text-xs md:text-sm font-bold text-slate-400 bg-white/50 backdrop-blur-sm px-5 py-3 rounded-2xl sm:rounded-full border border-slate-200 shrink-0">
                    <Shield size={16} className="text-brand-500 shrink-0" />
                    <span>Your data is strictly secured. Role verification may be required by administrators.</span>
                </div>
                </div>
            </main>
        </div>
    );
}
