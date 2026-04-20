'use client';

import { useRouter } from 'nextjs-toploader/app';
import { useState } from 'react';
import { Shield, ArrowRight, LogOut, HeartPulse, Fingerprint, Lock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import FloatingNav from '@/components/shared/FloatingNav';

export default function DashboardPage() {
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

    return (
        <div className="h-screen bg-slate-50 flex flex-col relative overflow-hidden font-sans">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-brand-900/5 pointer-events-none"></div>
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-400/10 rounded-full blur-3xl animate-pulse-slow pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

            <FloatingNav
                title="Health Platform"
                user={user}
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
                    <div className="flex items-center gap-2 mb-6 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-brand-600 text-white text-xs font-black shadow-sm shadow-brand-500/30">1</span>
                        <span className="text-xs font-black text-slate-700 uppercase tracking-widest shrink-0">Workspace Selection</span>
                        <div className="w-6 h-1 bg-slate-200 rounded-full mx-1" />
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-400 text-xs font-black opacity-50">2</span>
                        <div className="w-4 h-1 bg-slate-200 rounded-full mx-1 opacity-50" />
                        <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-100 text-slate-400 text-xs font-black opacity-50">3</span>
                    </div>

                    <div className="text-left max-w-2xl mb-8 md:mb-12 animate-in fade-in zoom-in-95 duration-500 delay-150">
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">Welcome to the Platform</h1>
                        <p className="text-slate-500 text-base md:text-lg leading-relaxed font-medium">
                            Your account creation is successful. To define your dedicated dashboard and activate your profile, please select a workspace module.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <button
                            onClick={() => router.push('/onboarding')}
                            className="group relative flex flex-col text-left p-6 md:p-8 bg-white rounded-2xl border-2 border-brand-200 hover:border-brand-500 hover:ring-brand-500/20 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                        >
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 shadow-sm transition-transform group-hover:scale-110 bg-brand-50 text-brand-500">
                                <HeartPulse className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-2">ECG Monitoring</h3>
                            <p className="text-slate-500 font-medium leading-relaxed mb-8 flex-1 text-sm">
                                Advanced Electrocardiogram monitoring module. Real-time cardiac telemetry and AI-assisted analysis.
                            </p>

                            <div className="mt-auto w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-white font-black text-sm uppercase tracking-widest transition-all bg-brand-500 group-hover:bg-brand-600">
                                Access Module <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                            </div>
                        </button>

                        <div className="group relative flex flex-col text-left p-6 md:p-8 bg-white/60 rounded-2xl border-2 border-slate-200 transition-all duration-300 shadow-sm opacity-80 grayscale-[20%] overflow-hidden cursor-not-allowed">
                            <div className="absolute top-6 right-6 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200 flex items-center gap-1.5 shadow-sm">
                                <Lock size={12} /> Restricted
                            </div>
                            <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-slate-100 text-slate-400">
                                <Fingerprint className="w-7 h-7" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-slate-600 mb-2">Biometric Data</h3>
                            <p className="text-slate-500 font-medium leading-relaxed mb-8 flex-1 text-sm">
                                Future module for comprehensive biometric tracking, blood pressure mapping, and wearable integration.
                            </p>

                            <div className="mt-auto w-full py-3.5 rounded-xl flex items-center justify-center gap-2 bg-slate-100 text-slate-400 font-black text-sm uppercase tracking-widest border border-slate-200">
                                Locked
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 flex flex-col sm:flex-row items-center text-center sm:text-left gap-2 text-xs md:text-sm font-bold text-slate-400 bg-white/50 backdrop-blur-sm px-5 py-3 rounded-2xl sm:rounded-full border border-slate-200 shrink-0">
                        <Shield size={16} className="text-brand-500 shrink-0" />
                        <span>All modules comply with strict medical data security and privacy standards.</span>
                    </div>
                </div>
            </main>
        </div>
    );
}
