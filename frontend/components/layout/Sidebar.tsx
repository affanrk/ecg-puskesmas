'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { getActiveProfile } from '@/utils/helpers';
import clsx from 'clsx';
import {
    LayoutDashboard,
    Activity,
    History,
    Settings,
    Lock,
    BrainCircuit,
    ShieldCheck
} from 'lucide-react';
import SidebarContainer from './SidebarContainer';

export default function Sidebar() {
    const pathname = usePathname();
    const { user, isSidebarPinned } = useStore();
    const isPatient = !!user?.is_patient;
    const isActivated = user?.is_activated === 1;
    const isAccessAllowed = isPatient && isActivated;
    const isAdmin = user?.role === 'admin';

    const navItems = [
        { name: 'Dashboard', href: '/patient/dashboard', icon: LayoutDashboard, allowed: true },
        { name: 'Classifier', href: '/patient/classifier', icon: BrainCircuit, allowed: isAccessAllowed },
        { name: 'History', href: '/patient/history', icon: History, allowed: isAccessAllowed },
        { name: 'Live Monitor', href: '/patient/monitor', icon: Activity, allowed: isAccessAllowed },
    ];

    const isVisible = (pinned: boolean) => clsx(
        "truncate transition-opacity duration-200",
        !pinned && "opacity-0 group-hover/sidebar:opacity-100"
    );

    return (
        <SidebarContainer>
            <p className={clsx("px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 transition-opacity", !isSidebarPinned && "opacity-0 group-hover/sidebar:opacity-100")}>Main Menu</p>
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
                        >
                            {pathname === item.href && <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 rounded-r-full" />}
                            <item.icon size={20} strokeWidth={2} className={clsx("transition-colors shrink-0", pathname === item.href ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600")} />
                            <span className={isVisible(isSidebarPinned)}>{item.name}</span>
                        </Link>
                    ) : (
                        <div className="flex items-center gap-3 px-4 py-3.5 rounded-md text-slate-300 cursor-not-allowed relative w-full opacity-60 hover:opacity-80 transition-opacity">
                            <item.icon size={20} className="shrink-0" />
                            <span className={clsx("truncate font-medium transition-opacity", !isSidebarPinned && "opacity-0 group-hover:opacity-100")}>{item.name}</span>
                            <Lock size={14} className={clsx("absolute right-4 text-slate-300 shrink-0 transition-opacity", !isSidebarPinned && "opacity-0 group-hover:opacity-100")} />
                            <div className="hidden lg:group-hover:block absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap z-50 pointer-events-none shadow-xl border border-slate-700">
                                {!isActivated ? (user?.is_activated === 0 && getActiveProfile(user)?.nik ? "Awaiting admin approval" : "Complete profile to unlock") : "Access restricted"}
                                <div className="absolute top-1/2 -left-1 w-2 h-2 bg-slate-800 transform -translate-y-1/2 rotate-45 border-l border-b border-slate-700"></div>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            <div className="my-6 border-t border-slate-100/80 mx-2" />

            {isAdmin && (
                <>
                    <p className={clsx("px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 transition-opacity", !isSidebarPinned && "opacity-0 group-hover/sidebar:opacity-100")}>Administration</p>
                    <Link
                        href="/admin/approvals"
                        className={clsx(
                            "flex items-center gap-3 px-4 py-3.5 rounded-md transition-all duration-200 font-bold text-sm w-full relative group",
                            pathname === '/admin/approvals'
                                ? "bg-rose-50 text-rose-700 shadow-sm ring-1 ring-rose-100"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        )}
                    >
                        {pathname === '/admin/approvals' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 rounded-r-full" />}
                        <ShieldCheck size={20} strokeWidth={2} className={clsx("transition-colors shrink-0", pathname === '/admin/approvals' ? "text-rose-600" : "text-slate-400 group-hover:text-slate-600")} />
                        <span className={isVisible(isSidebarPinned)}>User Approvals</span>
                    </Link>
                    <div className="my-6 border-t border-slate-100/80 mx-2" />
                </>
            )}

            <p className={clsx("px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1 transition-opacity", !isSidebarPinned && "opacity-0 group-hover/sidebar:opacity-100")}>Settings</p>
            <Link
                href="/patient/profile"
                className={clsx(
                    "flex items-center gap-3 px-4 py-3.5 rounded-md transition-all duration-200 font-bold text-sm w-full relative group",
                    pathname === '/patient/profile'
                        ? "bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-100"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
            >
                {pathname === '/patient/profile' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 rounded-r-full" />}
                <Settings size={20} strokeWidth={2} className={clsx("transition-colors shrink-0", pathname === '/patient/profile' ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600")} />
                <span className={isVisible(isSidebarPinned)}>Profile & Settings</span>
                {user && !isPatient && (
                    <span className={clsx("w-2 h-2 bg-amber-500 rounded-full ml-auto animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)] shrink-0 transition-opacity", !isSidebarPinned && "opacity-0 group-hover/sidebar:opacity-100")}></span>
                )}
            </Link>
        </SidebarContainer>
    );
}
