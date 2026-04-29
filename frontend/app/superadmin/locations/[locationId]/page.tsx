'use client';

import { use } from 'react';
import { useState, useEffect, useRef } from 'react';

import Link from 'next/link';

import { MapPin } from 'lucide-react';

import { useToast } from '@/hooks/useToast';
import { api } from '@/services';

export default function LocationDashboardPage({ params }: { params: Promise<{ locationId: string }> }) {
    const { locationId } = use(params);
    const { show: toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<{
        location_name?: string;
        total_users?: number;
        pending_approvals?: number;
        total_patients?: number;
        total_operators?: number;
        total_doctors?: number;
    } | null>(null);
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const loadDashboard = async () => {
            setLoading(true);
            try {
                const data = await api.fetchSuperAdminLocationDashboard(locationId);
                setStats(data);
            } catch (err: unknown) {
                console.error(err);
                toast('Failed to load location dashboard', 'error');
            } finally {
                setLoading(false);
            }
        };
        loadDashboard();
    }, [locationId, toast]);

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 p-6 lg:p-8 gap-6 overflow-hidden animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/superadmin/locations" className="text-xs font-bold text-violet-600 hover:text-violet-700 hover:underline">
                            &larr; Back to Locations
                        </Link>
                    </div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mt-2">
                        <MapPin className="text-violet-600" /> {loading ? 'Loading...' : stats?.location_name || 'Location'} Dashboard
                    </h2>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Viewing detailed capacity and activity for this individual location.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 shrink-0 mt-4">
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-violet-100 transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Staff & Patients</p>
                    <h3 className="text-3xl font-black text-slate-800 mt-1 tracking-tight">{loading ? '...' : stats?.total_users}</h3>
                </div>
                
                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-violet-100 transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pending Approvals</p>
                    <h3 className="text-3xl font-black text-slate-800 mt-1 tracking-tight">{loading ? '...' : stats?.pending_approvals}</h3>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-violet-100 transition-all gap-4 flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Patients</span>
                        <span className="text-lg font-black text-slate-800">{loading ? '...' : stats?.total_patients}</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-violet-100 transition-all gap-4 flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Doctors</span>
                        <span className="text-lg font-black text-slate-800">{loading ? '...' : stats?.total_doctors}</span>
                    </div>
                    <div className="h-px w-full bg-slate-100" />
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Operators</span>
                        <span className="text-lg font-black text-slate-800">{loading ? '...' : stats?.total_operators}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
