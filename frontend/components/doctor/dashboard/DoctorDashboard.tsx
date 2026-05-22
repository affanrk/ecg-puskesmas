'use client';

import { Clock, Stethoscope } from 'lucide-react';

import { useStore } from '@/store/useStore';
import { getActiveProfile } from '@/utils/helpers';

export default function DoctorDashboard() {
    const user = useStore(state => state.user);
    const profile = getActiveProfile(user);
    const displayName = profile?.full_name || user?.username || 'Doctor';
    const specialty = profile?.specialty;

    return (
        <div className="flex flex-col h-full w-full min-h-0 overflow-y-auto custom-scrollbar">
            <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[500px]">
                <div className="w-full max-w-xl text-center animate-in fade-in zoom-in-95 duration-700">
                    {/* Icon */}
                    <div className="relative inline-flex items-center justify-center mb-8">
                        <div className="absolute w-32 h-32 bg-rose-100 rounded-full animate-pulse opacity-60" />
                        <div className="relative w-24 h-24 bg-gradient-to-br from-rose-500 to-red-500 rounded-2xl flex items-center justify-center shadow-xl shadow-rose-500/25 rotate-3 hover:rotate-0 transition-transform duration-500">
                            <Stethoscope className="w-12 h-12 text-white" strokeWidth={1.5} />
                        </div>
                    </div>

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-5 shadow-sm">
                        <Clock size={11} strokeWidth={2.5} />
                        Coming Soon
                    </div>

                    {/* Heading */}
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight mb-4 leading-tight">
                        Specialist Dashboard
                    </h1>

                    <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed mb-8 max-w-md mx-auto">
                        Welcome back, <span className="font-black text-slate-700">{displayName}</span>
                        {specialty && (
                            <> · <span className="text-rose-600 font-bold">{specialty}</span></>
                        )}.
                        {' '}Your remote diagnostics workspace is being prepared with full ECG review capabilities.
                    </p>

                    {/* Feature preview cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                        {[
                            {
                                label: 'Patient Assignments',
                                desc: 'View and manage patients assigned to you across facilities',
                                color: 'text-rose-600',
                                bg: 'bg-rose-50',
                                border: 'border-rose-100',
                            },
                            {
                                label: 'ECG Review Queue',
                                desc: 'Analyze pending ECG recordings awaiting specialist review',
                                color: 'text-pink-600',
                                bg: 'bg-pink-50',
                                border: 'border-pink-100',
                            },
                            {
                                label: 'Remote Monitoring',
                                desc: 'Live telemetry feed from connected patients at all branches',
                                color: 'text-red-600',
                                bg: 'bg-red-50',
                                border: 'border-red-100',
                            },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className={`p-4 rounded-xl border ${item.bg} ${item.border} text-left opacity-60 cursor-not-allowed`}
                            >
                                <p className={`text-[10px] font-black uppercase tracking-widest ${item.color} mb-1`}>
                                    {item.label}
                                </p>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
