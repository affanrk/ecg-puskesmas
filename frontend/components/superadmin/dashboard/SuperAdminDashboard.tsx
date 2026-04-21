'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { api } from '@/services/api';
import { SuperAdminDashboardStats } from './parts/SuperAdminDashboardStats';

export default function SuperAdminDashboard() {
    const user = useStore(state => state.user);
    const [totalUsers, setTotalUsers] = useState(0);
    const [totalLocations, setTotalLocations] = useState(0);
    const [activeLocations, setActiveLocations] = useState(0);
    const [totalAdmins, setTotalAdmins] = useState(0);
    const [totalPatients, setTotalPatients] = useState(0);
    const [totalOperators, setTotalOperators] = useState(0);
    const [totalDoctors, setTotalDoctors] = useState(0);
    const [loading, setLoading] = useState(true);
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const loadData = async () => {
            setLoading(true);
            try {
                const dashboardData = await api.fetchSuperAdminDashboard();
                if (dashboardData) {
                    setTotalUsers(dashboardData.total_users || 0);
                    setTotalLocations(dashboardData.total_locations || 0);
                    setActiveLocations(dashboardData.active_locations || 0);
                    setTotalAdmins(dashboardData.total_admins || 0);
                    setTotalPatients(dashboardData.total_patients || 0);
                    setTotalOperators(dashboardData.total_operators || 0);
                    setTotalDoctors(dashboardData.total_doctors || 0);
                }
            } catch (error) {
                console.error("SuperAdmin Dashboard load failed", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 p-6 lg:p-8 gap-6 overflow-hidden animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <p className="text-sm font-medium text-slate-500 mt-1">
                        Welcome back, <span className="text-violet-600 font-bold">{user?.username}</span>. Here is the global platform summary.
                    </p>
                </div>
            </div>

            <SuperAdminDashboardStats
                loading={loading}
                totalUsers={totalUsers}
                totalLocations={totalLocations}
                activeLocations={activeLocations}
                totalAdmins={totalAdmins}
            />

            <div className="bg-white rounded-xl border border-slate-100 p-6">
                 <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Role Distribution</h3>
                 <div className="grid grid-cols-3 gap-4">
                     <div className="p-4 bg-slate-50 rounded-lg flex flex-col items-center">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Patients</span>
                         <span className="text-2xl font-black text-slate-700">{loading ? '...' : totalPatients}</span>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-lg flex flex-col items-center">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operators</span>
                         <span className="text-2xl font-black text-slate-700">{loading ? '...' : totalOperators}</span>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-lg flex flex-col items-center">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Doctors</span>
                         <span className="text-2xl font-black text-slate-700">{loading ? '...' : totalDoctors}</span>
                     </div>
                 </div>
            </div>
        </div>
    );
}
