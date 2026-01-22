'use client';

import DashboardSummary from '@/components/dashboard/DashboardSummary';
import { useStore } from '@/store/useStore';
import Link from 'next/link';
import { AlertCircle, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
    // 1. Hooks & State
    const { user } = useStore();

    // 2. Render
    return (
        <div className="space-y-6">
            {/* Incomplete Profile Alert */}
            {user && !user.is_patient && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Complete Your Profile</h3>
                            <p className="text-xs text-amber-600/80 mt-1 max-w-xl">
                                Access to live monitoring and analysis features is restricted until your medical profile identity is verified.
                            </p>
                        </div>
                    </div>
                    <Link 
                        href="/profile"
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center gap-2 whitespace-nowrap"
                    >
                        Go to Profile <ArrowRight size={14} />
                    </Link>
                </div>
            )}

            <DashboardSummary />
        </div>
    );
}
