'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, User, ChevronDown, LogOut, Settings } from 'lucide-react';
import DeviceDropdown from '@/components/monitor/DeviceDropdown';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { useStore } from '@/store/useStore';
import clsx from 'clsx';
import Link from 'next/link';

export default function Header() {
    // 1. Hooks & State
    const pathname = usePathname();
    const { user } = useStore();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // 2. Effects
    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 3. Handlers
    const handleLogout = () => {
        localStorage.removeItem('ecg_token');
        localStorage.removeItem('ecg_user');
        window.location.href = '/login';
    };

    // 4. Helpers & Computed
    const getPageTitle = (path: string) => {
        if (path.includes('/dashboard')) return 'Dashboard Overview';
        if (path.includes('/monitor')) return 'Live Monitoring';
        if (path.includes('/history')) return 'Recording History';
        if (path.includes('/performance')) return 'Network Performance';
        if (path.includes('/profile')) return 'User Profile';
        return 'Overview';
    };

    const isProfileComplete = user?.is_patient;

    // 5. Render
    return (
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 relative z-40">
            {/* Left: Title */}
            <div className="flex items-center gap-4 flex-1 lg:pl-0 pl-12">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest hidden md:block">
                    {getPageTitle(pathname)}
                </h2>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                {/* Device Selector (Only visible on Monitor page and if profile complete) */}
                {pathname.includes('/monitor') && isProfileComplete && (
                    <DeviceDropdown />
                )}

                {/* Notification Bell */}
                <button className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-100 hover:text-brand-600 transition-colors relative">
                    <Bell size={18} />
                    <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white"></span>
                </button>

                {/* User Menu */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                    >
                        <div className="text-right hidden md:block">
                            <p className="text-xs font-bold text-slate-700">{user ? (user.full_name || user.username) : 'Loading...'}</p>
                            <p className="text-[10px] text-slate-400 font-medium capitalize">{user?.role || 'Guest'}</p>
                        </div>
                        <div className={clsx(
                            "w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shadow-sm transition-transform active:scale-95",
                            !isProfileComplete ? "bg-amber-500" : "bg-gradient-to-br from-brand-500 to-brand-600"
                        )}>
                            {user ? user.username.charAt(0).toUpperCase() : <User size={16} />}
                        </div>
                        <ChevronDown size={14} className="text-slate-400" />
                    </button>

                    {/* Dropdown */}
                    {isUserMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50">
                                <p className="text-xs font-bold text-slate-700 truncate">{user?.username}</p>
                                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                            </div>

                            <div className="p-1">
                                <Link
                                    href="/profile"
                                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-brand-600 rounded-lg transition-colors group"
                                    onClick={() => setIsUserMenuOpen(false)}
                                >
                                    <Settings size={14} className="text-slate-400 group-hover:text-brand-600" />
                                    Profile Settings
                                    {!isProfileComplete && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full ml-auto"></span>}
                                </Link>
                                <button
                                    onClick={() => setShowLogoutConfirm(true)}
                                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg w-full text-left transition-colors"
                                >
                                    <LogOut size={14} />
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
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
        </header>
    );
}
