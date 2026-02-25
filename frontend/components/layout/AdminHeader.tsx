'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { 
    ChevronDown, 
    LogOut, 
    Settings, 
    ShieldCheck, 
    RefreshCcw, 
    CheckCircle2, 
    AlertCircle,
    LayoutDashboard,
    Activity,
    Users,
    UserCircle
} from 'lucide-react';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { useStore } from '@/store/useStore';
import clsx from 'clsx';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { globalEventBus } from '@/services/events';
import { EVENTS } from '@/config/constants';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';

export default function AdminHeader() {
    const pathname = usePathname();
    const { user } = useStore();
    const { logout } = useAuth();
    const { adminViewMode, setAdminViewMode, adminLoading, setAdminLoading, healthData, setHealthData } = useStore();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { show: toast } = useToast();

    const isApprovalsPage = pathname === '/admin/approvals';
    const isHealthPage = pathname === '/admin/health';
    const isUsersPage = pathname === '/admin/users';

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

    const { title: pageTitle, icon: PageIcon } = getPageConfig(pathname);

    return (
        <>
            <header className="h-[64px] bg-slate-900 border-b border-slate-800 px-8 flex items-center justify-between shrink-0 relative z-50 sticky top-0">
                <div className="flex items-center gap-4 flex-1 lg:pl-0 pl-12">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-rose-500/10 rounded flex items-center justify-center text-rose-500">
                            <PageIcon size={18} strokeWidth={2.5} />
                        </div>
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] hidden md:block">
                            {pageTitle}
                        </h2>
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
                                    "flex-1 relative z-10 h-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center",
                                    adminViewMode === 'queue' ? "text-white" : "text-slate-500 hover:text-slate-300"
                                )}
                            >
                                Queue
                            </button>
                            <button
                                onClick={() => setAdminViewMode('logs')}
                                className={clsx(
                                    "flex-1 relative z-10 h-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center",
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
                                "h-8 px-3 flex items-center justify-center gap-2 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-all active:scale-90 shadow-sm",
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
                                "h-8 px-3 flex items-center justify-center gap-2 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-all active:scale-90 shadow-sm",
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
                            className="h-8 px-3 flex items-center justify-center gap-2 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-all active:scale-90 shadow-sm"
                            title="Refresh Users List"
                        >
                            <RefreshCcw size={12} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Refresh</span>
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-5">
                    <div className="w-px h-8 bg-slate-800 hidden md:block" />
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-md hover:bg-slate-800 transition-colors border border-transparent group"
                        >
                            <div className="text-right hidden md:block">
                                <p className="text-xs font-bold text-slate-200 leading-tight group-hover:text-rose-400 transition-colors">{user?.username || 'Admin'}</p>
                                <p className="text-[9px] text-rose-500 font-black uppercase tracking-[0.2em] leading-tight mt-0.5">Administrator</p>
                            </div>
                            <div className="w-10 h-10 rounded-md bg-rose-600 flex items-center justify-center text-white font-black shadow-lg shadow-rose-900/20 ring-2 ring-rose-500/20">
                                {user ? user.username.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <ChevronDown size={16} className={clsx("text-slate-500 transition-transform duration-200", isUserMenuOpen && "rotate-180")} />
                        </button>
                        {isUserMenuOpen && (
                            <div className="absolute top-full right-0 mt-3 w-56 bg-slate-900 rounded-lg shadow-2xl border border-slate-800 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 z-[100]">
                                <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30">
                                    <p className="text-xs font-black text-white uppercase tracking-widest">{user?.username}</p>
                                    <p className="text-[10px] font-bold text-slate-500 truncate mt-1">{user?.email}</p>
                                </div>
                                <div className="p-1.5 space-y-0.5">
                                    <Link
                                        href="/admin/profile"
                                        className="flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-rose-400 rounded-md transition-colors group"
                                        onClick={() => setIsUserMenuOpen(false)}
                                    >
                                        <Settings size={16} />
                                        Account Settings
                                    </Link>
                                    <button
                                        onClick={() => setShowLogoutConfirm(true)}
                                        className="flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-md w-full text-left transition-colors group"
                                    >
                                        <LogOut size={16} />
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
                onConfirm={logout}
                title="End Admin Session?"
                message="Are you sure you want to terminate your administrative session and logout?"
                confirmText="Logout"
                isDestructive={true}
            />
        </>
    );
}
