'use client';

import { ReactNode, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { LogOut, ShieldCheck, User } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import AuthGuard from '@/components/shared/AuthGuard';

export default function AdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { user } = useStore();
    const { show: toast } = useToast();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const isMounted = useRef(false);

    useEffect(() => {
        if (!isMounted.current) {
            isMounted.current = true;
            return;
        }
        
        if (user && user.role !== 'admin') {
            toast("Access denied. Admin only.", "error");
            router.push('/dashboard');
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
        <AuthGuard>
            <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-600">
                {/* Minimal Admin-only Sidebar */}
                <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 z-50">
                    <div className="h-[72px] flex items-center gap-3 px-6 border-b border-slate-800">
                        <div className="w-8 h-8 bg-rose-500 rounded flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                            <ShieldCheck size={18} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-black text-sm text-white tracking-tight leading-none uppercase">Admin Panel</span>
                            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest leading-none mt-1">Management Console</span>
                        </div>
                    </div>

                    <nav className="flex-1 px-4 py-6 space-y-1.5">
                        <p className="px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Main Control</p>
                        <div className="flex items-center gap-3 px-4 py-3 rounded-md bg-rose-500/10 text-rose-400 font-bold text-sm ring-1 ring-rose-500/20">
                            <User size={18} />
                            <span>Approvals Queue</span>
                        </div>
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
        </AuthGuard>
    );
}
