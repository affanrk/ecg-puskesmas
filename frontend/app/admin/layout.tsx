'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { LogOut, ShieldCheck, User, Activity, Menu, X } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import Link from 'next/link';
import clsx from 'clsx';

export default function AdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useStore();
    const { show: toast } = useToast();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (user && user.role !== 'admin') {
            toast("Access denied. Admin only.", "error");
            router.replace('/dashboard');
        }
    }, [user, router, toast]);

    const handleLogout = () => {
        localStorage.removeItem('ecg_token');
        localStorage.removeItem('ecg_user');
        window.location.href = '/login';
    };

    // Prevent rendering admin content if user is definitely not an admin
    if (user && user.role !== 'admin') {
        return null;
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-600 relative">
            {/* Mobile Toggle */}
            <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden fixed top-4 left-4 z-[60] p-2 bg-slate-900 text-white rounded-lg shadow-xl"
            >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Minimal Admin-only Sidebar */}
            <aside className={clsx(
                "fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-50 transition-transform duration-300 lg:relative lg:translate-x-0",
                isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-[72px] flex items-center gap-3 px-6 border-b border-slate-800">
                    <div className="w-8 h-8 bg-rose-50 rounded flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                        <ShieldCheck size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-black text-sm text-white tracking-tight leading-none uppercase">Admin Panel</span>
                        <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest leading-none mt-1">Management Console</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1.5">
                    <p className="px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Main Control</p>
                    
                    <Link 
                        href="/admin/approvals"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={clsx(
                            "flex items-center gap-3 px-4 py-3 rounded-md font-bold text-sm transition-all",
                            pathname === '/admin/approvals' 
                                ? "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20" 
                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        )}
                    >
                        <User size={18} />
                        <span>Approvals Queue</span>
                    </Link>

                    <Link 
                        href="/admin/health"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={clsx(
                            "flex items-center gap-3 px-4 py-3 rounded-md font-bold text-sm transition-all",
                            pathname === '/admin/health' 
                                ? "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20" 
                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        )}
                    >
                        <Activity size={18} />
                        <span>System Health</span>
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-800 mt-auto">
                    <button 
                        onClick={() => setShowLogoutConfirm(true)}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-md text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all font-bold text-sm border border-transparent"
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Backdrop for mobile */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Content Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white relative z-10 overflow-hidden">
                <main className="flex-1 flex flex-col overflow-hidden relative custom-scrollbar">
                    {children}
                </main>
            </div>

            <ConfirmationModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="Confirm Logout"
                message="Are you sure you want to end your administrative session?"
                confirmText="Logout"
                isDestructive={true}
            />
        </div>
    );
}