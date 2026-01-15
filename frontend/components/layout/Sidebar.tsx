'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Download, Zap, LogOut, LayoutDashboard, HeartPulse } from 'lucide-react';
import clsx from 'clsx';

import { useStore } from '@/store/useStore';
import { useToast } from '@/hooks/useToast';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { resetSession } = useStore();
    const { show: toast } = useToast();

    const navItems = [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/monitor', icon: BarChart3, label: 'Live Monitor' },
        { href: '/history', icon: Download, label: 'Data Export' },
        { href: '/performance', icon: Zap, label: 'Performance' },
    ];

    const handleLogout = () => {
        toast("You have been signed out.", "success");
        setTimeout(() => {
            localStorage.removeItem('ecg_token');
            localStorage.removeItem('ecg_user');
            resetSession();
            router.push('/login');
        }, 1000);
    };

    return (
        <aside className="w-60 bg-white border-r border-slate-200 flex flex-col py-6 z-20 shadow-sm relative hidden sm:flex h-screen shrink-0 transition-all duration-300">
            {/* --- Logo & Brand --- */}
            <div className="px-6 mb-8 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center text-white shrink-0">
                    <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="font-bold text-slate-800 text-lg leading-tight tracking-tight">ECG Live</h1>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Puskesmas Platform</p>
                </div>
            </div>

            {/* --- Navigation --- */}
            <div className="flex-1 px-4 overflow-y-auto custom-scrollbar">
                <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Main Menu</p>
                <nav className="flex flex-col gap-1.5">
                    {navItems.map((item) => {
                        // Check active state strictly for dashboard vs others to avoid overlap if paths were nested
                        const isActive = pathname.startsWith(item.href);
                        
                        return (
                            <Link 
                                key={item.href}
                                href={item.href}
                                className={clsx(
                                    "group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                    isActive 
                                        ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100" 
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <item.icon className={clsx(
                                    "w-5 h-5 transition-colors",
                                    isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                                )} />
                                <span>{item.label}</span>
                                
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 shadow-sm shadow-blue-400"></div>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            
            {/* --- Footer / Logout --- */}
            <div className="mt-auto px-4 pt-4 border-t border-slate-100">
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 group"
                >
                    <LogOut className="w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-colors" />
                    <span>Sign Out</span>
                </button>
            </div>
        </aside>
    );
}