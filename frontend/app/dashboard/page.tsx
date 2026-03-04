'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Shield, User, Activity, ArrowRight, LogOut, HeartPulse, Fingerprint, Lock, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';

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
            
            <header className="px-4 md:px-8 py-4 md:py-5 relative z-10 flex flex-col sm:flex-row items-center justify-between shrink-0 gap-4 sm:gap-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/20">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-black text-xl text-slate-900 tracking-tight">Health Platform</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md px-4 py-2 rounded-full border border-slate-200/60 shadow-sm">
                        <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center shrink-0">
                            <User size={14} className="text-brand-600" />
                        </div>
                        <span className="text-xs md:text-sm font-bold text-slate-500 truncate max-w-[150px] md:max-w-none">Welcome, <span className="text-slate-800">{user.username}</span></span>
                    </div>
                    <button 
                        onClick={handleLogout} 
                        disabled={isLoggingOut}
                        className="flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md border border-slate-200/60 shadow-sm rounded-full text-sm font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-all group cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        title="Sign Out"
                    >
                        {isLoggingOut ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform shrink-0" />
                        )}
                        <span className="hidden sm:inline">{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center px-4 md:px-8 relative z-10 min-h-0 overflow-y-auto custom-scrollbar w-full">
                <div className="my-auto w-full max-w-5xl flex flex-col items-center shrink-0 py-4 md:py-6">
                    <div className="text-center max-w-2xl mb-8 md:mb-12 animate-in fade-in zoom-in-95 duration-500">
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">Select Module</h1>
                        <p className="text-slate-500 text-base md:text-lg leading-relaxed font-medium">
                            Choose the health monitoring module you wish to access.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <button
                            onClick={() => router.push('/onboarding')}
                            className="group relative flex flex-col text-left p-8 md:p-10 bg-white rounded-3xl border-2 border-brand-200 hover:border-brand-500 hover:ring-brand-500/20 transition-all duration-300 shadow-xl shadow-slate-200/50 cursor-pointer"
                        >
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm transition-transform group-hover:scale-110 bg-brand-50 text-brand-500">
                                <HeartPulse className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-3">ECG Monitoring</h3>
                            <p className="text-slate-500 font-medium leading-relaxed mb-8 flex-1 text-sm">
                                Advanced Electrocardiogram monitoring module. Real-time cardiac telemetry and AI-assisted analysis.
                            </p>
                            
                            <div className="mt-auto w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-white font-black text-sm uppercase tracking-widest transition-all bg-brand-500 group-hover:bg-brand-600">
                                Access Module <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                            </div>
                        </button>

                        <div className="group relative flex flex-col text-left p-8 md:p-10 bg-white/60 rounded-3xl border-2 border-slate-200 transition-all duration-300 shadow-lg shadow-slate-200/30 opacity-80 grayscale-[20%] overflow-hidden cursor-not-allowed">
                            <div className="absolute top-6 right-6 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 flex items-center gap-1.5 shadow-sm">
                                <Lock size={12} /> Future Development
                            </div>
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm bg-indigo-50 text-indigo-400">
                                <Fingerprint className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-700 mb-3">PPG Analysis</h3>
                            <p className="text-slate-400 font-medium leading-relaxed mb-8 flex-1 text-sm">
                                Photoplethysmography analysis module. Non-invasive optical monitoring of blood volume changes.
                            </p>
                            
                            <div className="mt-auto w-full py-3.5 rounded-xl flex items-center justify-center gap-2 text-slate-400 font-black text-sm uppercase tracking-widest transition-all bg-slate-100 border border-slate-200">
                                Currently Unavailable
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
