'use client';

import { useState, useRef, useEffect } from 'react';

import { usePathname } from 'next/navigation';

import clsx from 'clsx';
import { 
    ShieldCheck, 
    LayoutDashboard,
    Activity,
    Users,
    UserCircle,
    RefreshCcw,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';

import { UserMenu } from './parts/UserMenu';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { EVENTS } from '@/config/constants';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { api } from '@/services';
import { globalEventBus } from '@/services/websocket/events';
import { useStore } from '@/store/useStore';

export default function AdminHeader() {
    const pathname = usePathname();
    const user = useStore(state => state.user);
    const { logout } = useAuth();
    const adminViewMode = useStore(state => state.adminViewMode);
    const setAdminViewMode = useStore(state => state.setAdminViewMode);
    const adminLoading = useStore(state => state.adminLoading);
    const setAdminLoading = useStore(state => state.setAdminLoading);
    const healthData = useStore(state => state.healthData);
    const setHealthData = useStore(state => state.setHealthData);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { show: toast } = useToast();

    const isApprovalsPage = pathname === '/admin/approvals';
    const isHealthPage = pathname === '/admin/health';
    const isUsersPage = pathname === '/admin/users';
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
        setAdminLoading(true);
        globalEventBus.emit(EVENTS.STATE.LIVE_DATA_UPDATED);
        setTimeout(() => setAdminLoading(false), 2000);
    };

    const handleHealthRefresh = async () => {
        setAdminLoading(true);
        try {
            const data = await api.fetchDetailedHealth();
            setHealthData(data);
            toast("System health updated", "success");
        } catch (error) {
            console.error("Failed to refresh health data", error);
            toast("Failed to update system health", "error");
        } finally {
            setAdminLoading(false);
        }
    };

    const getPageConfig = (path: string) => {
        if (path.includes('/admin/dashboard')) return { title: 'Dashboard Overview', icon: LayoutDashboard };
        if (path.includes('/admin/approvals')) return { title: 'User Approvals', icon: ShieldCheck };
        if (path.includes('/admin/users')) return { title: 'User Management', icon: Users };
        if (path.includes('/admin/health')) return { title: 'System Health', icon: Activity };
        if (path.includes('/admin/profile')) return { title: 'Profile & Settings', icon: UserCircle };
        return { title: 'System Administration', icon: ShieldCheck };
    };

    const { title: pageTitle } = getPageConfig(pathname);

    return (
        <>
            <header className="h-[64px] bg-slate-900 border-b border-slate-800 px-8 flex items-center justify-between shrink-0 relative z-50 sticky top-0">
                <div className="flex items-center gap-4 flex-1 lg:pl-0 pl-12">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black text-white tracking-tight hidden md:block">
                            {pageTitle}
                        </h2>
                        <span className="hidden md:flex items-center justify-center px-2 py-0.5 bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">
                            Admin
                        </span>
                    </div>
                </div>

                {isApprovalsPage && (
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 animate-in fade-in duration-500">
                        <div className="flex items-center bg-slate-800/40 p-1 rounded-full relative w-[170px] h-[32px] border border-slate-800/50 shadow-inner">
                            <div
                                className={clsx(
                                    "absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-rose-600 rounded-full shadow-lg transition-all duration-300 ease-out z-0",
                                    adminViewMode === 'queue' ? "left-0.5" : "left-[calc(50%+0.5px)]"
                                )}
                            />
                            <button
                                onClick={() => setAdminViewMode('queue')}
                                className={clsx(
                                    "flex-1 relative z-10 h-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center cursor-pointer",
                                    adminViewMode === 'queue' ? "text-white" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                Queue
                            </button>
                            <button
                                onClick={() => setAdminViewMode('logs')}
                                className={clsx(
                                    "flex-1 relative z-10 h-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center cursor-pointer",
                                    adminViewMode === 'logs' ? "text-white" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                Logs
                            </button>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={adminLoading}
                            className={clsx(
                                "h-8 px-3 flex items-center justify-center gap-2 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-all active:scale-90 shadow-sm cursor-pointer",
                                adminLoading && "opacity-50 cursor-wait"
                            )}
                            title="Sync Verification Data"
                        >
                            <RefreshCcw size={12} className={clsx(adminLoading && "animate-spin")} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Refresh</span>
                        </button>
                    </div>
                )}

                {isHealthPage && healthData && (
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 animate-in fade-in duration-500">
                        <div className={clsx(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all",
                            healthData.status === 'healthy'
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse"
                        )}>
                            {healthData.status === 'healthy' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                            <span className="text-[9px] font-black uppercase tracking-widest">System {healthData.status}</span>
                        </div>
                        <div className="w-px h-4 bg-slate-800" />
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic hidden md:block">
                            Updated: {new Date(healthData.timestamp * 1000).toLocaleTimeString()}
                        </span>
                        <button
                            onClick={handleHealthRefresh}
                            disabled={adminLoading}
                            className={clsx(
                                "h-8 px-3 flex items-center justify-center gap-2 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-all active:scale-90 shadow-sm cursor-pointer",
                                adminLoading && "opacity-50 cursor-wait"
                            )}
                            title="Refresh System Health"
                        >
                            <RefreshCcw size={12} className={clsx(adminLoading && "animate-spin")} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Refresh</span>
                        </button>
                    </div>
                )}

                {isUsersPage && (
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 animate-in fade-in duration-500">
                        <button
                            onClick={handleRefresh}
                            disabled={adminLoading}
                            className={clsx(
                                "h-8 px-3 flex items-center justify-center gap-2 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-all active:scale-90 shadow-sm cursor-pointer",
                                adminLoading && "opacity-50 cursor-wait"
                            )}
                            title="Refresh Users List"
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
                        profileLink="/admin/profile"
                        isDark={true}
                    />
                </div>
            </header>
            <ConfirmationModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="End Admin Session?"
                message="Are you sure you want to terminate your administrative session and logout?"
                confirmText="Logout"
                isDestructive={true}
                isLoading={isLoggingOut}
            />
        </>
    );
}
