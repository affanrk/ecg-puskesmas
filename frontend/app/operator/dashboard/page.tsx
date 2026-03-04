'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Loader2 } from 'lucide-react';

export default function OperatorDashboard() {
    const { logout } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="flex items-center justify-center h-screen bg-slate-50 relative">
            <div className="absolute top-8 right-8">
                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-rose-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-50 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />} 
                    {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                </button>
            </div>
            <div className="text-center">
                <h1 className="text-3xl font-black text-slate-800 mb-2">Medical Staff Dashboard</h1>
                <p className="text-slate-500 font-medium">Welcome to the operator workspace.</p>
            </div>
        </div>
    );
}
