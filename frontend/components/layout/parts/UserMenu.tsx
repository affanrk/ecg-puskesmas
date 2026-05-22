import React from 'react';

import Link from 'next/link';

import clsx from 'clsx';
import { User as UserIcon, ChevronDown, Settings, LogOut } from 'lucide-react';

import { User } from '@/types/user';
import { getActiveProfile } from '@/utils/helpers';

interface UserMenuProps {
    user: User | null;
    isUserMenuOpen: boolean;
    setIsUserMenuOpen: (open: boolean) => void;
    setShowLogoutConfirm: (show: boolean) => void;
    menuRef: React.RefObject<HTMLDivElement | null>;
    isProfileComplete: boolean;
    profileLink?: string;
    isDark?: boolean;
}

export function UserMenu({
    user,
    isUserMenuOpen,
    setIsUserMenuOpen,
    setShowLogoutConfirm,
    menuRef,
    isProfileComplete,
    profileLink = '/dashboard',
    isDark = false
}: UserMenuProps) {
    const isSuperAdmin = user?.role === 'superadmin';
    const isOperator = user?.role === 'operator';
    const isDoctor = user?.role === 'doctor';

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className={clsx(
                    "flex items-center gap-3 pl-2 pr-1 py-1 rounded-md transition-colors border border-transparent group cursor-pointer",
                    isDark ? "hover:bg-slate-800" : "hover:bg-slate-50/80 hover:border-slate-100"
                )}
            >
                <div className="text-right hidden md:block">
                    <p className={clsx(
                        "text-xs font-bold leading-tight transition-colors",
                        isDark ? (isSuperAdmin ? "text-slate-200 group-hover:text-violet-400" : "text-slate-200 group-hover:text-rose-400") 
                        : isOperator ? "text-slate-700 group-hover:text-amber-700"
                        : isDoctor ? "text-slate-700 group-hover:text-rose-700"
                        : "text-slate-700 group-hover:text-teal-700"
                    )}>
                        {user ? (isDark ? user.username : ((getActiveProfile(user)?.full_name || "") || user.username)) : 'Loading...'}
                    </p>
                    <p className={clsx(
                        "text-[10px] font-bold uppercase tracking-wider leading-tight",
                        isDark ? (isSuperAdmin ? "text-violet-500 tracking-[0.2em] mt-0.5" : "text-rose-500 tracking-[0.2em] mt-0.5") : "text-slate-400"
                    )}>
                        {isDark ? (isSuperAdmin ? 'SuperAdmin' : 'Administrator') : (user?.role || 'Guest')}
                    </p>
                </div>
                <div className={clsx(
                    "w-10 h-10 rounded-md flex items-center justify-center text-white font-bold transition-transform active:scale-95",
                    isDark
                        ? (isSuperAdmin ? "bg-violet-600 shadow-lg shadow-violet-900/20 ring-2 ring-violet-500/20" : "bg-rose-600 shadow-lg shadow-rose-900/20 ring-2 ring-rose-500/20")
                        : isOperator ? clsx("shadow-md shadow-amber-200/50 ring-2 ring-white", !isProfileComplete ? "bg-amber-400" : "bg-gradient-to-br from-amber-500 to-orange-500")
                        : isDoctor ? clsx("shadow-md shadow-rose-200/50 ring-2 ring-white", !isProfileComplete ? "bg-amber-500" : "bg-gradient-to-br from-rose-500 to-red-500")
                        : (clsx("shadow-md shadow-slate-200 ring-2 ring-white", !isProfileComplete ? "bg-amber-500" : "bg-gradient-to-br from-teal-500 to-emerald-500"))
                )}>
                    {user ? user.username.charAt(0).toUpperCase() : (isDark ? 'A' : <UserIcon size={18} />)}
                </div>
                <ChevronDown size={16} className={clsx("transition-transform duration-200", isDark ? "text-slate-500" : "text-slate-300", isUserMenuOpen && "rotate-180")} />
            </button>
            {isUserMenuOpen && (
                <div className={clsx(
                    "absolute top-full right-0 mt-3 w-56 rounded-lg py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 z-[100]",
                    isDark ? "bg-slate-900 shadow-2xl border border-slate-800" : "bg-white shadow-xl shadow-slate-200/50 border border-slate-100 ring-1 ring-black/5"
                )}>
                    <div className={clsx(
                        "px-5 py-4 border-b",
                        isDark ? "border-slate-800 bg-slate-800/30" : "border-slate-50 bg-slate-50/30"
                    )}>
                        <p className={clsx(
                            "truncate",
                            isDark ? "text-xs font-black text-white uppercase tracking-widest" : "text-sm font-bold text-slate-800"
                        )}>{user?.username}</p>
                        <p className={clsx(
                            "truncate",
                            isDark ? "text-[10px] font-bold text-slate-500 mt-1" : "text-[10px] font-medium text-slate-500"
                        )}>{user?.email}</p>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                        <Link
                            href={profileLink}
                            className={clsx(
                                "flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold rounded-md transition-colors group",
                            isDark ? (isSuperAdmin ? "text-slate-400 hover:bg-slate-800 hover:text-violet-400" : "text-slate-400 hover:bg-slate-800 hover:text-rose-400") 
                                : isOperator ? "text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                                : isDoctor ? "text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                                : "text-slate-600 hover:bg-teal-50 hover:text-teal-700"
                            )}
                            onClick={() => setIsUserMenuOpen(false)}
                        >
                            <Settings size={16} className={clsx(
                                "transition-colors",
                                isDark ? "" 
                                : isOperator ? "text-slate-400 group-hover:text-amber-500"
                                : isDoctor ? "text-slate-400 group-hover:text-rose-500"
                                : "text-slate-400 group-hover:text-teal-500"
                            )} />
                            Account Settings
                            {!isDark && !isProfileComplete && <span className="w-2 h-2 bg-amber-500 rounded-full ml-auto shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>}
                        </Link>
                        <button
                            onClick={() => setShowLogoutConfirm(true)}
                            className={clsx(
                                "flex items-center gap-3 px-3.5 py-2.5 text-xs font-bold rounded-md w-full text-left transition-colors group cursor-pointer",
                                "text-rose-500 hover:bg-rose-500/10"
                            )}
                        >
                            <LogOut size={16} className="transition-colors" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
