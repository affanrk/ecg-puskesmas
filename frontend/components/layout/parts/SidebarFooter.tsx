import clsx from 'clsx';
import { LogOut, Pin, PinOff } from 'lucide-react';

interface SidebarFooterProps {
    className?: string;
    isSidebarPinned: boolean;
    setIsSidebarPinned: (pinned: boolean) => void;
    setShowLogoutConfirm: (show: boolean) => void;
    isHovered: boolean;
}

export function SidebarFooter({
    className,
    isSidebarPinned,
    setIsSidebarPinned,
    setShowLogoutConfirm,
    isHovered
}: SidebarFooterProps) {
    const isDark = className?.includes('bg-slate-900');
    const isAmber = !!className && (className.includes('bg-amber') || className.includes('theme-amber'));
    const isEmerald = !!className && className.includes('theme-emerald');
    const isRose = !!className && className.includes('theme-rose');
    const isVisible = isSidebarPinned || isHovered;

    return (
        <div className={clsx(
            "p-4 border-t shrink-0 flex flex-col gap-2",
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
        )}>
            <button
                onClick={() => setShowLogoutConfirm(true)}
                className={clsx(
                    "flex items-center gap-3 w-full px-4 py-3.5 rounded-md transition-all font-bold text-sm group border cursor-pointer",
                    isDark
                        ? "text-rose-500 hover:bg-rose-500/10 border-transparent hover:border-rose-500/20"
                        : "text-rose-600 hover:bg-rose-50 border-transparent hover:border-rose-100"
                )}
            >
                <div className={clsx(
                    "p-1.5 rounded-md transition-colors shrink-0",
                    isDark ? "bg-rose-500/10 text-rose-500" : "bg-rose-50 text-rose-500"
                )}>
                    <LogOut size={16} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform" />
                </div>
                <span className={clsx("truncate transition-opacity duration-200", !isVisible ? "opacity-0" : "opacity-100")}>Sign Out</span>
            </button>
            <button
                onClick={() => setIsSidebarPinned(!isSidebarPinned)}
                className={clsx(
                    "hidden lg:flex items-center gap-3 w-full px-4 py-2 rounded-md transition-all font-bold text-xs group border cursor-pointer",
                    isDark
                        ? (isSidebarPinned ? "text-slate-500 hover:text-slate-300 hover:bg-slate-800 border-transparent" : "text-rose-400 bg-rose-500/5 border-rose-500/10")
                        : (isSidebarPinned
                            ? "text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-transparent"
                            : (isAmber ? "text-amber-600 bg-amber-50 border-amber-100" : isEmerald ? "text-emerald-600 bg-emerald-50 border-emerald-100" : isRose ? "text-rose-600 bg-rose-50 border-rose-100" : "text-teal-600 bg-teal-50 border-teal-100"))
                )}
                title={isSidebarPinned ? "Unpin Sidebar (Auto-hide)" : "Pin Sidebar"}
            >
                <div className="shrink-0">
                    {isSidebarPinned ? <PinOff size={14} /> : <Pin size={14} />}
                </div>
                <span className={clsx("truncate transition-opacity duration-200", !isVisible ? "opacity-0" : "opacity-100")}>
                    {isSidebarPinned ? "Auto-hide Sidebar" : "Pin Sidebar"}
                </span>
            </button>
        </div>
    );
}
