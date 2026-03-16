import React from 'react';
import Link from 'next/link';
import { ChevronDown, Settings, LogOut } from 'lucide-react';
import clsx from 'clsx';
import { User } from '@/types/user';

interface AdminUserMenuProps {
    user: User | null;
    isUserMenuOpen: boolean;
    setIsUserMenuOpen: (open: boolean) => void;
    setShowLogoutConfirm: (show: boolean) => void;
    menuRef: React.RefObject<HTMLDivElement | null>;
}

export function AdminUserMenu({
    user,
    isUserMenuOpen,
    setIsUserMenuOpen,
    setShowLogoutConfirm,
    menuRef
}: AdminUserMenuProps) {
    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-md hover:bg-slate-800 transition-colors border border-transparent group cursor-pointer"
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
                            className="flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-500/10 rounded-md w-full text-left transition-colors group cursor-pointer"
                        >
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
