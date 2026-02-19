'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import clsx from 'clsx';
import {
    LayoutDashboard,
    Activity,
    ShieldCheck,
    UserCircle
} from 'lucide-react';
import SidebarContainer from './SidebarContainer';

export default function AdminSidebar() {
    const pathname = usePathname();
    const { isSidebarPinned } = useStore();

    const navItems = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'User Approvals', href: '/admin/approvals', icon: ShieldCheck },
        { name: 'System Health', href: '/admin/health', icon: Activity },
    ];

    const isVisible = (pinned: boolean) => clsx(
        "truncate transition-opacity duration-200",
        !pinned && "opacity-0 group-hover/sidebar:opacity-100"
    );

    return (
        <SidebarContainer className="bg-slate-900 border-slate-800">
            <p className={clsx("px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1 transition-opacity", !isSidebarPinned && "opacity-0 group-hover/sidebar:opacity-100")}>Security & Control</p>
            {navItems.map((item) => (
                <div key={item.href} className="relative group">
                    <Link
                        href={item.href}
                        className={clsx(
                            "flex items-center gap-3 px-4 py-3.5 rounded-md transition-all duration-200 font-bold text-sm w-full group relative overflow-hidden",
                            pathname === item.href
                                ? "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20 shadow-sm shadow-rose-500/5"
                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        )}
                    >
                        {pathname === item.href && <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 rounded-r-full" />}
                        <item.icon size={20} strokeWidth={2} className={clsx("transition-colors shrink-0", pathname === item.href ? "text-rose-500" : "text-slate-500 group-hover:text-slate-300")} />
                        <span className={isVisible(isSidebarPinned)}>{item.name}</span>
                    </Link>
                </div>
            ))}

            <div className="my-6 border-t border-slate-800 mx-2" />

            <p className={clsx("px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1 transition-opacity", !isSidebarPinned && "opacity-0 group-hover/sidebar:opacity-100")}>Account</p>
            <Link
                href="/admin/profile"
                className={clsx(
                    "flex items-center gap-3 px-4 py-3.5 rounded-md transition-all duration-200 font-bold text-sm w-full relative group overflow-hidden",
                    pathname === '/admin/profile'
                        ? "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20 shadow-sm shadow-rose-500/5"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
            >
                {pathname === '/admin/profile' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500 rounded-r-full" />}
                <UserCircle size={20} strokeWidth={2} className={clsx("transition-colors shrink-0", pathname === '/admin/profile' ? "text-rose-500" : "text-slate-500 group-hover:text-slate-300")} />
                <span className={isVisible(isSidebarPinned)}>Profile & Settings</span>
            </Link>
        </SidebarContainer>
    );
}
