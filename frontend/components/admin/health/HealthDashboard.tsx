'use client';

import { useEffect, useCallback, useRef } from 'react';
import {
    Database,
    Cpu,
    Wifi,
    RefreshCcw,
    Server,
    Activity
} from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/hooks/useToast';
import { useStore } from '@/store/useStore';
import { HealthCard } from './parts/HealthCard';
import { PerformancePanel } from './parts/PerformancePanel';

export default function HealthDashboard() {
    const healthData = useStore(state => state.healthData);
    const setHealthData = useStore(state => state.setHealthData);
    const adminLoading = useStore(state => state.adminLoading);
    const setAdminLoading = useStore(state => state.setAdminLoading);
    const { show: toast } = useToast();
    const isFetching = useRef(false);

    const loadHealth = useCallback(async (silent = false) => {
        if (isFetching.current) return;
        isFetching.current = true;
        if (!silent) setAdminLoading(true);
        try {

            const data = await api.fetchDetailedHealth();
            setHealthData(data);
        } catch {
            toast("Failed to load system health", "error");
        } finally {
            if (!silent) setAdminLoading(false);
            isFetching.current = false;
        }
    }, [toast, setHealthData, setAdminLoading]);

    useEffect(() => {
        loadHealth();
        const interval = setInterval(() => loadHealth(true), 10000);
        return () => clearInterval(interval);
    }, [loadHealth]);

    if (adminLoading && !healthData) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center py-20">
                <RefreshCcw size={40} className="text-rose-200 animate-spin mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Diagnosing System...</p>
            </div>
        );
    }
    if (!healthData) return null;
    const { components, buffers, performance } = healthData;

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 p-5 lg:p-6 gap-6 overflow-hidden animate-in fade-in duration-500">
            <div className="shrink-0 h-[32%] min-h-[180px] flex flex-col">
                <div className="flex items-center gap-2 mb-3 shrink-0">
                    <Server size={14} className="text-slate-400" />
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Core Infrastructure</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 flex-1">
                    <HealthCard
                        title="PostgreSQL"
                        subtitle="Database Engine"
                        icon={<Database size={20} />}
                        isHealthy={components.database.status === 'healthy'}
                        color="indigo"
                        value={`${components.database.latency_ms || 0}ms`}
                    />
                    <HealthCard
                        title="Mosquitto"
                        subtitle="MQTT Broker"
                        icon={<Wifi size={20} />}
                        isHealthy={components.mqtt.status === 'connected'}
                        color="amber"
                        value={components.mqtt.status.toUpperCase()}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <HealthCard
                            title="AI 5-Leads"
                            subtitle="Neural Analysis"
                            icon={<Cpu size={20} />}
                            isHealthy={components.ml_model_5leads?.status === 'loaded'}
                            color="rose"
                            value={components.ml_model_5leads?.status === 'loaded' ? 'ACTIVE' : 'OFFLINE'}
                        />
                        <HealthCard
                            title="AI 12-Leads"
                            subtitle="Neural Analysis"
                            icon={<Cpu size={20} />}
                            isHealthy={components.ml_model_12leads?.status === 'loaded'}
                            color="emerald"
                            value={components.ml_model_12leads?.status === 'loaded' ? 'ACTIVE' : 'OFFLINE'}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                    <Activity size={14} className="text-slate-400" />
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Data Stream Performance</h3>
                </div>
                <PerformancePanel 
                    performance={performance}
                    components={components}
                    buffers={buffers}
                />
            </div>
        </div>
    );
}
