'use client';

import { useAuth } from '@/hooks/useAuth';
import { LogOut } from 'lucide-react';

export default function OperatorDashboard() {
    const { logout } = useAuth();

    return (
        <div className="flex items-center justify-center h-screen bg-slate-50 relative">
            <div className="absolute top-8 right-8">
                <button
                    onClick={logout}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-rose-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-50 transition-all shadow-sm active:scale-95"
                >
                    <LogOut size={16} /> Sign Out
                </button>
            </div>
            <div className="text-center">
                <h1 className="text-3xl font-black text-slate-800 mb-2">Medical Staff Dashboard</h1>
                <p className="text-slate-500 font-medium">Welcome to the operator workspace.</p>
            </div>
        </div>
    );
}
