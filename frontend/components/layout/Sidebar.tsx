'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import clsx from 'clsx';
import { 
    LayoutDashboard, 
    Activity, 
    History, 
    BarChart2, 
    Settings, 
    LogOut, 
    Menu, 
    X,
    Lock
} from 'lucide-react';

export default function Sidebar() {
    // 1. Hooks & State
    const pathname = usePathname();
    const { user } = useStore();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // 2. Computed
    const isProfileComplete = user?.is_patient;

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, allowed: true },
        { name: 'Live Monitor', href: '/monitor', icon: Activity, allowed: isProfileComplete },
        { name: 'History', href: '/history', icon: History, allowed: isProfileComplete },
        { name: 'Performance', href: '/performance', icon: BarChart2, allowed: isProfileComplete },
    ];

    // 3. Handlers
    const handleLogout = () => {
        localStorage.removeItem('ecg_token');
        localStorage.removeItem('ecg_user');
        window.location.href = '/login';
    };

    // 4. Render
    return (
        <>
            {/* Mobile Toggle */}
            <button 
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-slate-200 text-slate-600"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Sidebar Container */}
            <aside className={clsx(
                "fixed lg:static top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-40 transition-transform duration-300 ease-in-out flex flex-col overflow-hidden",
                "lg:translate-x-0",
                isMobileOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Logo Area */}
                <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
                    <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/30">
                        <Activity className="text-white w-5 h-5" />
                    </div>
                    <span className="font-extrabold text-lg text-slate-800 tracking-tight">ECG Live</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-2">Menu</p>
                    
                    {navItems.map((item) => (
                        <div key={item.href} className="relative group">
                            {item.allowed ? (
                                <Link 
                                    href={item.href}
                                    className={clsx(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm group w-full",
                                        pathname === item.href 
                                            ? "bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-200" 
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                    onClick={() => setIsMobileOpen(false)}
                                >
                                    <item.icon size={18} className={clsx("transition-colors shrink-0", pathname === item.href ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600")} />
                                    <span className="truncate">{item.name}</span>
                                </Link>
                            ) : (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 cursor-not-allowed relative w-full">
                                    <item.icon size={18} className="shrink-0" />
                                    <span className="truncate">{item.name}</span>
                                    <Lock size={12} className="absolute right-4 text-slate-300 shrink-0" />
                                    
                                    {/* Tooltip - Fixed positioning to avoid overflow */}
                                    <div className="hidden lg:group-hover:block absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl">
                                        Complete profile to access
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-6">System</p>
                    
                    <Link 
                        href="/profile" 
                        className={clsx(
                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium text-sm w-full",
                            pathname === '/profile' 
                                ? "bg-brand-50 text-brand-700 shadow-sm ring-1 ring-brand-200" 
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                        onClick={() => setIsMobileOpen(false)}
                    >
                        <Settings size={18} className={clsx("transition-colors shrink-0", pathname === '/profile' ? "text-brand-600" : "text-slate-400")} />
                        <span className="truncate">Profile & Settings</span>
                        {user && !user.is_patient && <span className="w-2 h-2 bg-amber-500 rounded-full ml-auto animate-pulse shrink-0"></span>}
                    </Link>
                </nav>

                {/* Footer / User */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/30 shrink-0">
                    <button 
                        onClick={() => setShowLogoutConfirm(true)}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 transition-all font-medium text-sm group"
                    >
                        <LogOut size={18} className="group-hover:translate-x-[-2px] transition-transform shrink-0" />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Overlay */}
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

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