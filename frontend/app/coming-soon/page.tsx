'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, LogOut, Shield, Stethoscope, User } from 'lucide-react';
import clsx from 'clsx';

export default function ComingSoonPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('ecg_user');
        if (userStr) {
            setUser(JSON.parse(userStr));
        }
    }, []);

    const handleLogout = () => {
        // Brief buffer before redirecting
        setTimeout(() => {
            localStorage.removeItem('ecg_token');
            localStorage.removeItem('ecg_user');
            router.push('/login');
        }, 1000);
    };

    const role = user?.role?.toLowerCase() || 'user';

    const config: any = {
        admin: {
            title: "Admin Dashboard",
            sub: "System Control Panel",
            message: "User management and system configuration.",
            icon: Shield,
            color: "text-rose-500",
            bg: "bg-rose-50",
            shadow: "shadow-rose-100"
        },
        doctor: {
            title: "Doctor Dashboard",
            sub: `Welcome, Dr. ${user?.name || 'Doctor'}!`,
            message: "Medical analysis tools are under development.",
            icon: Stethoscope,
            color: "text-emerald-500",
            bg: "bg-emerald-50",
            shadow: "shadow-emerald-100"
        },
        user: {
            title: "Patient Dashboard",
            sub: `Welcome, ${user?.name || 'User'}!`,
            message: "This panel is currently under development.",
            icon: User,
            color: "text-brand-500",
            bg: "bg-brand-50",
            shadow: "shadow-brand-100"
        },
        operator: {
            title: "Operator Panel",
            sub: "Device Management",
            message: "Specialized operator tools are coming soon.",
            icon: Clock,
            color: "text-amber-500",
            bg: "bg-amber-50",
            shadow: "shadow-amber-100"
        }
    };

    const current = config[role] || config.user;
    const Icon = current.icon;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8 bg-white p-10 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden">
                <div className={clsx("absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-50", current.bg)}></div>
                
                <div className="relative z-10">
                    <div className={clsx("w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg", current.bg, current.shadow)}>
                        <Icon className={clsx("w-10 h-10", current.color)} />
                    </div>
                    
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{current.title}</h1>
                    <p className="text-brand-600 font-bold text-sm mt-2">{current.sub}</p>
                    
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mt-8 mb-8 text-center">
                        <p className="text-slate-600 font-semibold">Coming Soon</p>
                        <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed">
                            {current.message}
                        </p>
                    </div>
                </div>

                <div className="relative z-10 pt-4">
                    <button 
                        onClick={handleLogout}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 px-6 rounded-xl transition-colors active:scale-[0.98] uppercase tracking-widest text-xs"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
