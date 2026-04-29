'use client';

import { useState, useRef, useEffect } from 'react';

import { usePathname } from 'next/navigation';

import clsx from 'clsx';
import {
    ShieldCheck,
    LayoutDashboard,
    Users,
    MapPin,
    RefreshCcw
} from 'lucide-react';

import { UserMenu } from './parts/UserMenu';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { EVENTS } from '@/config/constants';
import { useAuth } from '@/hooks/useAuth';
import { globalEventBus } from '@/services/websocket/events';
import { useStore } from '@/store/useStore';

export default function SuperAdminHeader() {
    const pathname = usePathname();
    const user = useStore(state => state.user);
    const { logout } = useAuth();
    const adminLoading = useStore(state => state.adminLoading);

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const isLocationsPage = pathname === '/superadmin/locations';
    const isAdminsPage = pathname === '/superadmin/admins';
    const isUsersPage = pathname === '/superadmin/users';
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        logout();
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRefresh = () => {
        globalEventBus.emit(EVENTS.STATE.LIVE_DATA_UPDATED);
    };

    const getPageConfig = (path: string) => {
        if (path.includes('/superadmin/dashboard')) return { title: 'Global Platform Overview', icon: LayoutDashboard };
        if (path.includes('/superadmin/locations')) return { title: 'Multi-Location Management', icon: MapPin };
        if (path.includes('/superadmin/admins')) return { title: 'Admin Directory', icon: ShieldCheck };
        if (path.includes('/superadmin/users')) return { title: 'Global User Database', icon: Users };
        return { title: 'Super Administration', icon: ShieldCheck };
    };

    const { title: pageTitle } = getPageConfig(pathname);

    return (
        <>
            <header className="h-[64px] bg-slate-900 border-b border-slate-800 px-8 flex items-center justify-between shrink-0 relative z-50 sticky top-0 shadow-lg shadow-black/5">
                <div className="flex items-center gap-4 flex-1 lg:pl-0 pl-12">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black text-white tracking-tight hidden md:block">
                            {pageTitle}
                        </h2>
                        <span className="hidden md:flex items-center justify-center px-2 py-0.5 bg-violet-500/20 border border-violet-500/30 text-violet-400 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">
                            SuperAdmin
                        </span>
                    </div>
                </div>

                {(isLocationsPage || isAdminsPage || isUsersPage) && (
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 animate-in fade-in duration-500">
                        <button
                            onClick={handleRefresh}
                            disabled={adminLoading}
                            className={clsx(
                                "h-8 px-3 flex items-center justify-center gap-2 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-violet-400 hover:bg-slate-800 transition-all active:scale-90 shadow-sm cursor-pointer",
                                adminLoading && "opacity-50 cursor-wait"
                            )}
                            title="Refresh Data"
                        >
                            <RefreshCcw size={12} className={clsx(adminLoading && "animate-spin")} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Refresh</span>
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-5">
                    <div className="w-px h-8 bg-slate-800 hidden md:block" />
                    <UserMenu
                        user={user}
                        isUserMenuOpen={isUserMenuOpen}
                        setIsUserMenuOpen={setIsUserMenuOpen}
                        setShowLogoutConfirm={setShowLogoutConfirm}
                        menuRef={menuRef}
                        isProfileComplete={true}
                        profileLink="/superadmin/dashboard"
                        isDark={true}
                    />
                </div>
            </header>
            <ConfirmationModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="End SuperAdmin Session?"
                message="Are you sure you want to terminate your super administrative session and logout?"
                confirmText="Logout"
                isDestructive={true}
                isLoading={isLoggingOut}
            />
        </>
    );
}
