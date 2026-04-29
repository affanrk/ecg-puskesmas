import Link from 'next/link';
import { Users, MapPin, ShieldCheck, ArrowRight, Cpu } from 'lucide-react';

interface SuperAdminDashboardStatsProps {
    loading: boolean;
    totalUsers: number;
    totalLocations: number;
    activeLocations: number;
    totalAdmins: number;
}

export function SuperAdminDashboardStats({ 
    loading, 
    totalUsers, 
    totalLocations, 
    activeLocations, 
    totalAdmins 
}: SuperAdminDashboardStatsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 shrink-0">
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-violet-100 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-violet-600 group-hover:scale-110 transition-transform duration-500">
                    <MapPin size={80} />
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center mb-3">
                            <MapPin size={20} />
                        </div>
                        <Link href="/superadmin/locations" className="text-[10px] font-black uppercase tracking-widest text-violet-600 hover:text-violet-700 flex items-center gap-1">
                            Manage <ArrowRight size={10} />
                        </Link>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Locations</p>
                    <h3 className="text-3xl font-black text-slate-800 mt-1 tracking-tight">{loading ? '...' : totalLocations}</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-2">{loading ? '...' : activeLocations} System Active</p>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-100 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-blue-600 group-hover:scale-110 transition-transform duration-500">
                    <Users size={80} />
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-3">
                            <Users size={20} />
                        </div>
                        <Link href="/superadmin/users" className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 flex items-center gap-1">
                            Directory <ArrowRight size={10} />
                        </Link>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Users</p>
                    <h3 className="text-3xl font-black text-slate-800 mt-1 tracking-tight">{loading ? '...' : totalUsers}</h3>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-100 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-emerald-600 group-hover:scale-110 transition-transform duration-500">
                    <ShieldCheck size={80} />
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3">
                            <ShieldCheck size={20} />
                        </div>
                        <Link href="/superadmin/admins" className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                            View <ArrowRight size={10} />
                        </Link>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Admins</p>
                    <h3 className="text-3xl font-black text-slate-800 mt-1 tracking-tight">{loading ? '...' : totalAdmins}</h3>
                </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-rose-100 transition-all">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-rose-600 group-hover:scale-110 transition-transform duration-500">
                    <Cpu size={80} />
                </div>
                <div className="relative z-10">
                    <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center mb-3">
                        <Cpu size={20} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Status</p>
                    <h3 className="text-2xl font-black text-slate-800 mt-2 tracking-tight">ONLINE</h3>
                </div>
            </div>
        </div>
    );
}
