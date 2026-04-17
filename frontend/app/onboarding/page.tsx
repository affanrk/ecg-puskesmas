'use client';

import { useRouter } from 'nextjs-toploader/app';
import { useState } from 'react';
import { Shield, User, Clock, ArrowRight, ArrowLeft, Stethoscope, LogOut } from 'lucide-react';
import clsx from 'clsx';
import FloatingNav from '@/components/shared/FloatingNav';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';

export default function OnboardingPage() {
    const router = useRouter();
    const { user } = useStore();
    const { logout } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    if (!user) return null;

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
        } finally {
            setIsLoggingOut(false);
        }
    };

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
            status: 'Available',
            approvalRequired: true
        },
        {
            id: 'operator',
            title: 'Medical Staff',
            description: 'I assist patients in taking ECG recordings at the Puskesmas/Clinic. (Nurse / GP)',
            icon: Clock,
            color: 'text-amber-500',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            hover: 'hover:border-amber-500 hover:ring-amber-500/20',
            buttonBg: 'bg-amber-500',
            buttonHover: 'group-hover:bg-amber-600',
            action: () => router.push('/onboarding/operator'),
            status: 'Available',
            approvalRequired: true
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
            status: 'Available',
            approvalRequired: true
        }
    ];

    return (
        <div className="h-screen bg-slate-50 flex flex-col relative overflow-hidden font-sans">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-brand-900/5 pointer-events-none"></div>
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-400/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <FloatingNav
                user={user}
                backAction={{
                    label: 'Back to Dashboard',
                    onClick: () => router.push('/dashboard')
                }}
                primaryAction={{
                    label: 'Sign Out',
                    icon: LogOut,
                    isDestructive: true,
                    isLoading: isLoggingOut,
                    onClick: handleLogout
                }}
            />

            <main className="flex-1 flex flex-col items-center px-4 md:px-8 relative z-10 min-h-0 overflow-y-auto custom-scrollbar w-full">
                <div className="my-auto w-full max-w-5xl flex flex-col items-start shrink-0 py-6 md:py-8">
                    {/* Stepper Visual */}
                    <div className="flex items-center gap-2 mb-6 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 font-bold items-center justify-center"><ArrowLeft size={12} /></div>
                        <div className="w-4 h-1 bg-brand-500 rounded-full mx-1" />
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-brand-600 text-white text-xs font-black shadow-sm shadow-brand-500/30">2</span>
                        <span className="text-xs font-black text-slate-700 uppercase tracking-widest shrink-0">Identity Definition</span>
                        <div className="w-6 h-1 bg-slate-200 rounded-full mx-1" />
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-400 text-xs font-black opacity-50">3</span>
                    </div>

                    <div className="text-left max-w-2xl mb-8 md:mb-12 animate-in fade-in zoom-in-95 duration-500 delay-150">
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">Choose Your Identity</h1>
                        <p className="text-slate-500 text-base md:text-lg leading-relaxed font-medium">
                            Welcome to the platform. To tailor your experience, please select the role that best describes you.
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
                                    disabled={isComingSoon}
                                    className={clsx(
                                        "group relative flex flex-col text-left p-5 md:p-6 bg-white rounded-2xl border-2 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1",
                                        isComingSoon ? "opacity-80 grayscale-[30%] cursor-not-allowed" : "cursor-pointer " + role.hover,
                                        role.border
                                    )}
                                >
                                    {isComingSoon && (
                                        <div className="absolute top-4 right-4 px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                            Coming Soon
                                        </div>
                                    )}
                                    {!isComingSoon && role.approvalRequired && (
                                        <div className="absolute top-4 right-4 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-200 flex items-center gap-1.5 shadow-sm">
                                            <Clock size={10} strokeWidth={2.5} /> Requires Approval
                                        </div>
                                    )}
                                    {!isComingSoon && !role.approvalRequired && (
                                        <div className="absolute top-4 right-4 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-200 flex items-center gap-1.5 shadow-sm">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Instant Access
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
