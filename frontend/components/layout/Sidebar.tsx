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
    Settings, 
    LogOut, 
    Menu, 
    X,
    Lock,
    HeartPulse,
    Pin,
    PinOff,
    ChevronsRight,
    BrainCircuit,
    ShieldCheck
} from 'lucide-react';

export default function Sidebar() {
    const pathname = usePathname();
    const { user, isSidebarPinned, setIsSidebarPinned } = useStore();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const isPatient = !!user?.is_patient;
    const isActivated = user?.is_activated === 1;
    const isAccessAllowed = isPatient && isActivated;
    const isAdmin = user?.role === 'admin';
    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, allowed: true },
        { name: 'Classifier', href: '/classifier', icon: BrainCircuit, allowed: isAccessAllowed },
        { name: 'History', href: '/history', icon: History, allowed: isAccessAllowed },
        { name: 'Live Monitor', href: '/monitor', icon: Activity, allowed: isAccessAllowed },
    ];

    const handleLogout = () => {
        localStorage.removeItem('ecg_token');
        localStorage.removeItem('ecg_user');
        window.location.href = '/login';
    };

    return (
        <>
            <button 
                className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-md shadow-md border border-slate-200 text-slate-600 hover:text-teal-600 transition-colors"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <aside 
                className={clsx(
                    "fixed top-0 left-0 h-full w-72 bg-white border-r border-slate-200 z-[60] transition-all duration-300 ease-in-out flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full",
                    (isSidebarPinned || isHovered) 
                        ? "lg:translate-x-0 lg:shadow-xl" 
                        : "lg:-translate-x-[92%] lg:opacity-90 hover:opacity-100 lg:shadow-none"
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {!isSidebarPinned && !isHovered && (
                    <div className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-pointer group">
                        <div className="w-1 h-12 bg-slate-300 rounded-full group-hover:bg-teal-400 transition-colors" />
                        <ChevronsRight size={16} className="text-slate-400 absolute opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                    </div>
                )}
                <div className="h-[72px] flex items-center gap-3 px-6 border-b border-slate-100/50 bg-white shrink-0 relative overflow-hidden group-hover:bg-slate-50/30 transition-colors">
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-50/50 to-transparent pointer-events-none" />
                    <div className="relative w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-md flex items-center justify-center shadow-lg shadow-teal-500/20 ring-4 ring-teal-50 shrink-0">
                        <HeartPulse className="text-white w-6 h-6" strokeWidth={2.5} />
                    </div>
                    <div className={clsx("relative flex flex-col transition-opacity duration-200", (!isSidebarPinned && !isHovered) ? "opacity-0" : "opacity-100")}>
                        <span className="font-black text-xl text-slate-800 tracking-tight leading-none whitespace-nowrap">ECG Live</span>
                        <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest leading-none mt-1 whitespace-nowrap">Medical Platform</span>
                    </div>
                </div>
                <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    <p className={clsx("px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 transition-opacity", (!isSidebarPinned && !isHovered) && "opacity-0")}>Main Menu</p>
                    {navItems.map((item) => (
                        <div key={item.href} className="relative group">
                            {item.allowed ? (
                                <Link 
                                    href={item.href}
                                    className={clsx(
                                        "flex items-center gap-3 px-4 py-3.5 rounded-md transition-all duration-200 font-bold text-sm w-full group relative overflow-hidden",
                                        pathname === item.href 
                                            ? "bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-100" 
                                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                    onClick={() => setIsMobileOpen(false)}
                                >
                                    {pathname === item.href && <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 rounded-r-full" />}
                                    <item.icon size={20} strokeWidth={2} className={clsx("transition-colors shrink-0", pathname === item.href ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600")} />
                                    <span className={clsx("truncate transition-opacity duration-200", (!isSidebarPinned && !isHovered) ? "opacity-0" : "opacity-100")}>{item.name}</span>
                                </Link>
                            ) : (
                                <div className="flex items-center gap-3 px-4 py-3.5 rounded-md text-slate-300 cursor-not-allowed relative w-full opacity-60 hover:opacity-80 transition-opacity">
                                    <item.icon size={20} className="shrink-0" />
                                    <span className={clsx("truncate font-medium transition-opacity", (!isSidebarPinned && !isHovered) ? "opacity-0" : "opacity-100")}>{item.name}</span>
                                    <Lock size={14} className={clsx("absolute right-4 text-slate-300 shrink-0 transition-opacity", (!isSidebarPinned && !isHovered) ? "opacity-0" : "opacity-100")} />
                                    <div className="hidden lg:group-hover:block absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 pointer-events-none shadow-xl border border-slate-700">
                                        {!isActivated ? (user?.is_activated === 0 && user?.nik ? "Awaiting admin approval" : "Complete profile to unlock") : "Access restricted"}
                                        <div className="absolute top-1/2 -left-1 w-2 h-2 bg-slate-800 transform -translate-y-1/2 rotate-45 border-l border-b border-slate-700"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="my-6 border-t border-slate-100/80 mx-2" />
                    {isAdmin && (
                        <>
                            <p className={clsx("px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 transition-opacity", (!isSidebarPinned && !isHovered) && "opacity-0")}>Administration</p>
                            <Link 
                                href="/admin/approvals" 
                                className={clsx(
                                    "flex items-center gap-3 px-4 py-3.5 rounded-md transition-all duration-200 font-bold text-sm w-full relative group",
                                    pathname === '/admin/approvals' 
                                        ? "bg-rose-50 text-rose-700 shadow-sm ring-1 ring-rose-100" 
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                )}
                                onClick={() => setIsMobileOpen(false)}
                            >
                                {pathname === '/admin/approvals' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 rounded-r-full" />}
                                <ShieldCheck size={20} strokeWidth={2} className={clsx("transition-colors shrink-0", pathname === '/admin/approvals' ? "text-rose-600" : "text-slate-400 group-hover:text-slate-600")} />
                                <span className={clsx("truncate transition-opacity duration-200", (!isSidebarPinned && !isHovered) ? "opacity-0" : "opacity-100")}>User Approvals</span>
                            </Link>
                            <div className="my-6 border-t border-slate-100/80 mx-2" />
                        </>
                    )}
                    <p className={clsx("px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 transition-opacity", (!isSidebarPinned && !isHovered) && "opacity-0")}>Settings</p>
                    <Link 
                        href="/profile" 
                        className={clsx(
                            "flex items-center gap-3 px-4 py-3.5 rounded-md transition-all duration-200 font-bold text-sm w-full relative group",
                            pathname === '/profile' 
                                ? "bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-100" 
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        )}
                        onClick={() => setIsMobileOpen(false)}
                    >
                        {pathname === '/profile' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 rounded-r-full" />}
                        <Settings size={20} strokeWidth={2} className={clsx("transition-colors shrink-0", pathname === '/profile' ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600")} />
                        <span className={clsx("truncate transition-opacity duration-200", (!isSidebarPinned && !isHovered) ? "opacity-0" : "opacity-100")}>Profile & Settings</span>
                        {user && !isPatient && (
                            <span className={clsx("w-2 h-2 bg-amber-500 rounded-full ml-auto animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)] shrink-0 transition-opacity", (!isSidebarPinned && !isHovered) && "opacity-0")}></span>
                        )}
                    </Link>
                </nav>
                <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex flex-col gap-2">
                    <button 
                        onClick={() => setShowLogoutConfirm(true)}
                        className="flex items-center gap-3 w-full px-4 py-3.5 rounded-md text-rose-600 hover:bg-rose-50 transition-all font-bold text-sm group border border-transparent hover:border-rose-100"
                    >
                        <div className="p-1.5 bg-rose-50 text-rose-500 rounded-md group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors shrink-0">
                            <LogOut size={16} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
                        </div>
                        <span className={clsx("truncate transition-opacity duration-200", (!isSidebarPinned && !isHovered) ? "opacity-0" : "opacity-100")}>Sign Out</span>
                    </button>
                    <button 
                        onClick={() => setIsSidebarPinned(!isSidebarPinned)}
                        className={clsx(
                            "hidden lg:flex items-center gap-3 w-full px-4 py-2 rounded-md transition-all font-bold text-xs group border border-transparent",
                            isSidebarPinned 
                                ? "text-slate-400 hover:text-slate-600 hover:bg-slate-50" 
                                : "text-teal-600 bg-teal-50 border-teal-100"
                        )}
                        title={isSidebarPinned ? "Unpin Sidebar (Auto-hide)" : "Pin Sidebar"}
                    >
                        <div className="shrink-0">
                            {isSidebarPinned ? <PinOff size={14} /> : <Pin size={14} />}
                        </div>
                        <span className={clsx("truncate transition-opacity duration-200", (!isSidebarPinned && !isHovered) ? "opacity-0" : "opacity-100")}>
                            {isSidebarPinned ? "Auto-hide Sidebar" : "Pin Sidebar"}
                        </span>
                    </button>
                </div>
            </aside>
            {isMobileOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 lg:hidden animate-in fade-in"
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
