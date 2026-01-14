'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Download, Zap, LogOut } from 'lucide-react';
import clsx from 'clsx';

import { useStore } from '@/store/useStore';
import { useToast } from '@/hooks/useToast';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { resetSession } = useStore();
    const { show: toast } = useToast();

    const navItems = [
        { href: '/monitor', icon: BarChart3, label: 'Live Monitor' },
        { href: '/history', icon: Download, label: 'Data Export' },
        { href: '/performance', icon: Zap, label: 'Performance' },
    ];

    const handleLogout = () => {
        toast("You have been signed out.", "success");
        
        // Brief buffer before redirecting
        setTimeout(() => {
            localStorage.removeItem('ecg_token');
            localStorage.removeItem('ecg_user');
            resetSession();
            router.push('/login');
        }, 1000);
    };

    return (
        <aside className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 z-20 shadow-sm relative hidden sm:flex h-screen shrink-0">
            <div className="mb-8 w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl shadow-lg shadow-brand-500/20 flex items-center justify-center text-white font-bold text-xl">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            </div>

            <nav className="flex-1 w-full flex flex-col gap-4 px-2">
                {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link 
                            key={item.href}
                            href={item.href}
                            title={item.label}
                            className={clsx(
                                "group w-full aspect-square rounded-xl flex items-center justify-center transition-all",
                                isActive 
                                    ? "text-brand-700 bg-brand-50 ring-1 ring-brand-200 shadow-sm" 
                                    : "text-slate-400 hover:bg-slate-50 hover:text-brand-600"
                            )}
                        >
                            <item.icon className="w-6 h-6" />
                        </Link>
                    );
                })}
            </nav>
            
            <div className="mt-auto pb-6 w-full px-2">
                <button 
                    onClick={handleLogout}
                    className="w-full aspect-square rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-300 cursor-pointer border border-transparent hover:border-rose-100" 
                    title="Sign Out"
                >
                    <LogOut className="w-6 h-6" />
                </button>
            </div>
        </aside>
    );
}
