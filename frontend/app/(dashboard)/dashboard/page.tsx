'use client';

import DashboardSummary from '@/components/dashboard/DashboardSummary';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { ShieldAlert, ArrowRight, Lock, Activity, FileCheck, Stethoscope } from 'lucide-react';
import clsx from 'clsx';

export default function DashboardPage() {
    const { user } = useStore();
    
    const isRestricted = user && !user.is_patient;

    return (
        <div className="relative w-full h-full min-h-0 flex flex-col overflow-hidden bg-white">
            <div className="flex-1 min-h-0 border-t border-slate-100">
                {isRestricted && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-white/30 backdrop-blur-sm">
                        <div className="w-full max-w-2xl bg-white rounded-xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden relative animate-in fade-in zoom-in-95 duration-500 group">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-60"></div>
                            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-50/50 to-transparent pointer-events-none"></div>

                            <div className="p-8 md:p-10 relative z-10">
                                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                                    <div className="relative shrink-0">
                                        <div className="w-20 h-20 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shadow-inner group-hover:scale-105 transition-transform duration-500">
                                            <Lock size={32} className="text-slate-400" />
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-amber-100 rounded-md flex items-center justify-center border-2 border-white shadow-sm animate-bounce">
                                            <ShieldAlert size={14} className="text-amber-600" />
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-3">
                                                <Activity size={12} />
                                                System Access Restricted
                                            </div>
                                            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-tight">
                                                Account Activation Required
                                            </h2>
                                        </div>
                                        
                                        <p className="text-slate-500 text-sm md:text-base leading-relaxed font-medium">
                                            To access real-time telemetry and AI analysis, we need to verify your medical identity. This ensures full standard compliance and data security.
                                        </p>

                                        <div className="pt-4 flex flex-col md:flex-row items-center gap-4">
                                            <Link 
                                                href="/profile"
                                                className="relative overflow-hidden w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-md font-bold text-sm transition-all shadow-xl shadow-slate-200 active:scale-[0.98] flex items-center justify-center gap-3 group/btn"
                                            >
                                                <span className="relative z-10 flex items-center gap-2">
                                                    Complete Profile
                                                    <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                                </span>
                                                <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                                            </Link>

                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 px-4 py-2 bg-slate-50 rounded-md cursor-help hover:bg-slate-100 transition-colors" title="Your data is encrypted end-to-end">
                                                <FileCheck size={14} className="text-teal-500" />
                                                Identity Verification Pending
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 border-t border-slate-100 p-4 text-center md:text-left transition-colors group-hover:bg-teal-50/50">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center md:justify-start gap-2 group-hover:text-teal-600 transition-colors">
                                    <Stethoscope size={14} />
                                    Clinical Dashboard • Locked for New User
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className={clsx(
                    "transition-all duration-700 ease-out h-full min-h-0",
                    isRestricted ? "filter blur-lg opacity-30 pointer-events-none scale-[0.98] grayscale-[0.5]" : "opacity-100 filter-none"
                )}>
                    <DashboardSummary />
                </div>
            </div>
        </div>
    );
}