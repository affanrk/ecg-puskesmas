'use client';

import { useState, ReactNode } from 'react';
import { useStore } from '@/store/useStore';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import clsx from 'clsx';
import {
    LogOut,
    Menu,
    X,
    HeartPulse,
    Pin,
    PinOff,
    ChevronsRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SidebarContainerProps {
    children: ReactNode;
    className?: string;
}

export default function SidebarContainer({ children, className }: SidebarContainerProps) {
    const { isSidebarPinned, setIsSidebarPinned } = useStore();
    const { logout } = useAuth();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleLogout = async () => {
        await logout();
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
                    "fixed top-0 left-0 h-full w-72 border-r z-[60] transition-all duration-300 ease-in-out flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] group/sidebar",
                    className || "bg-white border-slate-200",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full",
                    (isSidebarPinned || isHovered)
                        ? "lg:translate-x-0 lg:shadow-xl"
                        : "lg:-translate-x-[calc(100%-12px)] lg:opacity-100 lg:shadow-none"
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
                <div className={clsx(
                    "h-[72px] flex items-center gap-3 px-6 border-b shrink-0 relative overflow-hidden group-hover:bg-slate-50/30 transition-colors",
                    className?.includes('bg-slate-900') ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100/50"
                )}>
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-50/50 to-transparent pointer-events-none" />
                    <div className={clsx(
                        "relative w-10 h-10 rounded-md flex items-center justify-center shadow-lg shadow-teal-500/20 ring-4 ring-teal-50 shrink-0",
                        className?.includes('bg-slate-900') ? "bg-rose-600 ring-slate-800" : "bg-gradient-to-br from-teal-500 to-emerald-500 ring-teal-50"
                    )}>
                        <HeartPulse className="text-white w-6 h-6" strokeWidth={2.5} />
                    </div>
                    <div className={clsx("relative flex flex-col transition-opacity duration-200", (!isSidebarPinned && !isHovered) ? "opacity-0" : "opacity-100")}>
                        <span className={clsx(
                            "font-black text-xl tracking-tight leading-none whitespace-nowrap",
                            className?.includes('bg-slate-900') ? "text-white" : "text-slate-800"
                        )}>ECG Live</span>
                        <span className={clsx(
                            "text-[10px] font-bold uppercase tracking-widest leading-none mt-1 whitespace-nowrap",
                            className?.includes('bg-slate-900') ? "text-rose-500" : "text-teal-600"
                        )}>Medical Platform</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {children}
                </nav>

                <div className={clsx(
                    "p-4 border-t shrink-0 flex flex-col gap-2",
                    className?.includes('bg-slate-900') ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                )}>
                    <button
                        onClick={() => setShowLogoutConfirm(true)}
                        className={clsx(
                            "flex items-center gap-3 w-full px-4 py-3.5 rounded-md transition-all font-bold text-sm group border",
                            className?.includes('bg-slate-900')
                                ? "text-rose-500 hover:bg-rose-500/10 border-transparent hover:border-rose-500/20"
                                : "text-rose-600 hover:bg-rose-50 border-transparent hover:border-rose-100"
                        )}
                    >
                        <div className={clsx(
                            "p-1.5 rounded-md transition-colors shrink-0",
                            className?.includes('bg-slate-900') ? "bg-rose-500/10 text-rose-500" : "bg-rose-50 text-rose-500"
                        )}>
                            <LogOut size={16} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
                        </div>
                        <span className={clsx("truncate transition-opacity duration-200", (!isSidebarPinned && !isHovered) ? "opacity-0" : "opacity-100")}>Sign Out</span>
                    </button>
                    <button
                        onClick={() => setIsSidebarPinned(!isSidebarPinned)}
                        className={clsx(
                            "hidden lg:flex items-center gap-3 w-full px-4 py-2 rounded-md transition-all font-bold text-xs group border",
                            className?.includes('bg-slate-900')
                                ? (isSidebarPinned ? "text-slate-500 hover:text-slate-300 hover:bg-slate-800 border-transparent" : "text-rose-400 bg-rose-500/5 border-rose-500/10")
                                : (isSidebarPinned ? "text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-transparent" : "text-teal-600 bg-teal-50 border-teal-100")
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
