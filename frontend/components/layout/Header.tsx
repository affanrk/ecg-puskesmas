'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { User, ChevronDown, LogOut, Settings } from 'lucide-react';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { useStore } from '@/store/useStore';
import clsx from 'clsx';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function Header() {
    const pathname = usePathname();
    const { user, isRecording } = useStore();
    const { logout } = useAuth();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const isProfileComplete = user?.is_patient;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
    };

    const getPageTitle = (path: string) => {
        if (path.includes('/dashboard')) return 'Dashboard Overview';
        if (path.includes('/monitor')) return 'Live Monitoring';
        if (path.includes('/history')) return 'Recording History';
        if (path.includes('/performance')) return 'Network Performance';
        if (path.includes('/profile')) return 'User Profile';
        return 'System User';
    };

    return (
        <>
            <header className="h-[64px] bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 relative z-50 sticky top-0">
                <div className="flex items-center gap-4 flex-1 lg:pl-0 pl-12">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight hidden md:block">
                        {getPageTitle(pathname)}
                    </h2>
                </div>
                <div className="flex items-center gap-5">
                    {isRecording && (
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-100 rounded-md animate-in fade-in slide-in-from-right-2 duration-500 shadow-sm shadow-rose-100">
                            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.5)]"></span>
                            <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Recording Live</span>
                        </div>
                    )}

                    <div className="w-px h-8 bg-slate-200 hidden md:block" />
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-md hover:bg-slate-50/80 transition-colors border border-transparent hover:border-slate-100 group"
                        >
                            <div className="text-right hidden md:block">
                                <p className="text-xs font-bold text-slate-700 leading-tight group-hover:text-teal-700 transition-colors">{user ? (user.full_name || user.username) : 'Loading...'}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-tight">{user?.role || 'Guest'}</p>
                            </div>
                            <div className={clsx(
                                "w-10 h-10 rounded-md flex items-center justify-center text-white font-bold shadow-md shadow-slate-200 transition-transform active:scale-95 ring-2 ring-white",
                                !isProfileComplete ? "bg-amber-500" : "bg-gradient-to-br from-teal-500 to-emerald-500"
                            )}>
                                {user ? user.username.charAt(0).toUpperCase() : <User size={18} />}
                            </div>
                            <ChevronDown size={16} className={clsx("text-slate-300 transition-transform duration-200", isUserMenuOpen && "rotate-180")} />
                        </button>
                        {isUserMenuOpen && (
                            <div className="absolute top-full right-0 mt-3 w-56 bg-white rounded-lg shadow-xl shadow-slate-200/50 border border-slate-100 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 z-[100] ring-1 ring-black/5">
                                <div className="px-5 py-4 border-b border-slate-50 bg-slate-50/30">
                                    <p className="text-sm font-bold text-slate-800 truncate">{user?.username}</p>
                                    <p className="text-[10px] font-medium text-slate-500 truncate">{user?.email}</p>
                                </div>
                                <div className="p-1.5 space-y-0.5">
                                    <Link
                                        href="/patient/profile"
                                        className="flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold text-slate-600 hover:bg-teal-50 hover:text-teal-700 rounded-md transition-colors group"
                                        onClick={() => setIsUserMenuOpen(false)}
                                    >
                                        <Settings size={16} className="text-slate-400 group-hover:text-teal-500 transition-colors" />
                                        Account Settings
                                        {!isProfileComplete && <span className="w-2 h-2 bg-amber-500 rounded-full ml-auto shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>}
                                    </Link>
                                    <button
                                        onClick={() => setShowLogoutConfirm(true)}
                                        className="flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-md w-full text-left transition-colors group"
                                    >
                                        <LogOut size={16} className="text-rose-400 group-hover:text-rose-600 transition-colors" />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>
            <ConfirmationModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="Confirm Logout"
                message="Are you sure you want to end your session and logout from the system?"
                confirmText="Logout"
                isDestructive={true}
            />
        </>
    );
}
