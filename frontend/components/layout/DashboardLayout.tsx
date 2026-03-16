'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useStore } from '@/store/useStore';
import clsx from 'clsx';

interface DashboardLayoutProps {
    children: ReactNode;
    sidebar?: ReactNode;
    header?: ReactNode;
}

export default function DashboardLayout({ children, sidebar, header }: DashboardLayoutProps) {
    const isSidebarPinned = useStore(state => state.isSidebarPinned);

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-600">
            {sidebar || <Sidebar />}
            <div
                className={clsx(
                    "flex-1 flex flex-col min-w-0 bg-white shadow-2xl relative z-10 overflow-hidden transition-all duration-300 ease-in-out",
                    isSidebarPinned ? "lg:pl-72" : "lg:pl-[12px]"
                )}
            >
                {header || <Header />}
                <main className="flex-1 flex flex-col overflow-hidden relative custom-scrollbar bg-white">
                    {children}
                </main>
            </div>
        </div>
    );
}
