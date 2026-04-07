'use client';

import { useState, ReactNode } from 'react';
import { useStore } from '@/store/useStore';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import clsx from 'clsx';
import {
    ChevronsRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { MobileMenuToggle } from './parts/MobileMenuToggle';
import { SidebarBrand } from './parts/SidebarBrand';
import { SidebarFooter } from './parts/SidebarFooter';

interface SidebarContainerProps {
    children: ReactNode;
    className?: string;
}

export default function SidebarContainer({ children, className }: SidebarContainerProps) {
    const isSidebarPinned = useStore(state => state.isSidebarPinned);
    const setIsSidebarPinned = useStore(state => state.setIsSidebarPinned);
    const { logout } = useAuth();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const isAmber = !!className && (className.includes('bg-amber') || className.includes('theme-amber'));

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await logout();
    };

    return (
        <>
            <MobileMenuToggle 
                isOpen={isMobileOpen} 
                onClick={() => setIsMobileOpen(!isMobileOpen)} 
            />
            
            <aside
                className={clsx(
                    "fixed top-0 left-0 h-full w-72 border-r z-[60] transition-all duration-300 ease-in-out flex flex-col shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] group/sidebar",
                    className,
                    (!className || !className.includes('bg-')) && "bg-white border-slate-200",
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
                        <div className={clsx(
                            "w-1 h-12 bg-slate-300 rounded-full transition-colors",
                            isAmber ? "group-hover:bg-amber-500" : "group-hover:bg-teal-400"
                        )} />
                        <ChevronsRight size={16} className="text-slate-400 absolute opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
                    </div>
                )}
                
                <SidebarBrand 
                    className={className} 
                    isSidebarPinned={isSidebarPinned} 
                    isHovered={isHovered} 
                />

                <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {children}
                </nav>

                <SidebarFooter 
                    className={className}
                    isSidebarPinned={isSidebarPinned}
                    setIsSidebarPinned={setIsSidebarPinned}
                    setShowLogoutConfirm={setShowLogoutConfirm}
                    isHovered={isHovered}
                />
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
                isLoading={isLoggingOut}
            />
        </>
    );
}
