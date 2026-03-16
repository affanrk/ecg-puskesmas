'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { 
    ShieldCheck, 
    LayoutDashboard,
    Activity,
    Users,
    UserCircle
} from 'lucide-react';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { globalEventBus } from '@/services/events';
import { EVENTS } from '@/config/constants';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { AdminUserMenu } from './parts/AdminUserMenu';
import { AdminPageActions } from './parts/AdminPageActions';

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

                <AdminPageActions 
                    isApprovalsPage={isApprovalsPage}
                    isHealthPage={isHealthPage}
                    isUsersPage={isUsersPage}
                    adminViewMode={adminViewMode}
                    setAdminViewMode={setAdminViewMode}
                    handleRefresh={handleRefresh}
                    handleHealthRefresh={handleHealthRefresh}
                    adminLoading={adminLoading}
                    healthData={healthData}
                />

                <div className="flex items-center gap-5">
                    <div className="w-px h-8 bg-slate-800 hidden md:block" />
                    <AdminUserMenu 
                        user={user}
                        isUserMenuOpen={isUserMenuOpen}
                        setIsUserMenuOpen={setIsUserMenuOpen}
                        setShowLogoutConfirm={setShowLogoutConfirm}
                        menuRef={menuRef}
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
