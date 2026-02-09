'use client';

import { useEffect, useState, ElementType } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Shield, Stethoscope, User } from 'lucide-react';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import clsx from 'clsx';

interface UserData {
    name: string;
    role: string;
}

interface RoleConfig {
    title: string;
    sub: string;
    message: string;
    icon: ElementType;
    color: string;
    bg: string;
    shadow: string;
}

export default function ComingSoonPage() {
    const router = useRouter();
    const [user, setUser] = useState<UserData | null>(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        const userStr = localStorage.getItem('ecg_user');
        if (userStr) {
            try {
                const userData = JSON.parse(userStr);
                setTimeout(() => setUser(userData), 0);
            } catch (e) {
                console.error("Failed to parse user", e);
            }
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('ecg_token');
        localStorage.removeItem('ecg_user');
        router.push('/login');
    };

    const role = user?.role?.toLowerCase() || 'user';

    const config: Record<string, RoleConfig> = {
        admin: {
            title: "Administrator",
            sub: "System Control Panel",
            message: "User management and facility configuration.",
            icon: Shield,
            color: "text-rose-500",
            bg: "bg-rose-50",
            shadow: "shadow-rose-100"
        },
        doctor: {
            title: "Heart Specialist",
            sub: `Welcome, Dr. ${user?.name || 'Doctor'}!`,
            message: "Advanced cardiac analysis tools are under development.",
            icon: Stethoscope,
            color: "text-emerald-500",
            bg: "bg-emerald-50",
            shadow: "shadow-emerald-100"
        },
        user: {
            title: "Patient Dashboard",
            sub: `Welcome, ${user?.name || 'User'}!`,
            message: "Real-time monitoring and history access.",
            icon: User,
            color: "text-brand-500",
            bg: "bg-brand-50",
            shadow: "shadow-brand-100"
        },
        operator: {
            title: "Medical Staff",
            sub: "Nurse / General Practitioner",
            message: "Device management and session control for patients.",
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
                        onClick={() => setShowLogoutConfirm(true)}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 px-6 rounded-xl transition-colors active:scale-[0.98] uppercase tracking-widest text-xs"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            <ConfirmationModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="Confirm Logout"
                message="Are you sure you want to end your session and logout from the system?"
                confirmText="Logout"
                isDestructive={true}
            />
        </div>
    );
}
