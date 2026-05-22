'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, Bell, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react';

import CredentialsHeader from './parts/CredentialsHeader';
import { EVENTS } from '@/config/constants';
import { useToast } from '@/hooks/useToast';
import { api } from '@/services';
import { globalEventBus } from '@/services/websocket/events';
import { useStore } from '@/store/useStore';
import { parseApiError } from '@/utils/helpers';

interface ExpiringCredential {
    user_id: string;
    full_name: string;
    role: string;
    credential_type: string;
    credential_number: string;
    expiry_date: string;
    days_until_expiry: number;
    primary_location?: string;
}

export default function CredentialExpirationDashboard() {
    const { show: toast } = useToast();
    const { setAdminLoading } = useStore();
    const [credentials, setCredentials] = useState<ExpiringCredential[]>([]);
    const [loading, setLoading] = useState(true);
    const [notifying, setNotifying] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [refreshKey, setRefreshKey] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    const [daysThreshold, setDaysThreshold] = useState('30');
    const [credentialTypeFilter, setCredentialTypeFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    const fetchIdRef = useRef(0);
    const lastFetchedRef = useRef("");
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setAdminLoading(loading);
    }, [loading, setAdminLoading]);

    const handleRefresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
        toast("Credential data updated", "success");
    }, [toast]);

    useEffect(() => {
        globalEventBus.on(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefresh);
        return () => globalEventBus.off(EVENTS.STATE.LIVE_DATA_UPDATED, handleRefresh);
    }, [handleRefresh]);

    useEffect(() => {
        setCurrentPage(1);
    }, [daysThreshold, credentialTypeFilter, roleFilter]);

    useEffect(() => {
        const totalPages = Math.ceil(credentials.length / rowsPerPage) || 1;
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [credentials.length, rowsPerPage, currentPage]);

    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.contentRect.height;
                const headerHeight = 48;
                const availableHeight = height - headerHeight;
                const idealRows = 10;
                const rowHeight = 48;
                const calculatedRows = Math.max(1, Math.floor(availableHeight / rowHeight));
                if (calculatedRows >= idealRows) {
                    setRowsPerPage(idealRows);
                } else {
                    setRowsPerPage(calculatedRows);
                }
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const currentParams = JSON.stringify({
            daysThreshold,
            credentialTypeFilter,
            roleFilter,
            refreshKey
        });
        if (lastFetchedRef.current === currentParams) return;

        const currentFetchId = ++fetchIdRef.current;

        const loadCredentials = async () => {
            setLoading(true);
            lastFetchedRef.current = currentParams;

            try {
                const params: { days: string; credential_type?: string } = {
                    days: daysThreshold,
                };
                if (credentialTypeFilter) params.credential_type = credentialTypeFilter;
                
                const response = await api.getExpiringCredentials(params);
                const data = response || [];
                
                let filtered = data;
                if (roleFilter) {
                    filtered = filtered.filter((c: ExpiringCredential) => c.role === roleFilter);
                }
                
                if (currentFetchId === fetchIdRef.current) {
                    setCredentials(filtered);
                }
            } catch (err) {
                if (currentFetchId === fetchIdRef.current) {
                    const { message } = parseApiError(err as Error);
                    toast(message, 'error');
                    lastFetchedRef.current = "";
                }
            } finally {
                if (currentFetchId === fetchIdRef.current) {
                    setLoading(false);
                    setAdminLoading(false);
                }
            }
        };

        loadCredentials();
    }, [daysThreshold, credentialTypeFilter, roleFilter, refreshKey, toast, setAdminLoading]);

    const handleSelectAll = () => {
        const paginatedIds = paginatedCredentials.map(c => c.user_id);
        if (paginatedIds.every(id => selectedIds.has(id))) {
            const newSelected = new Set(selectedIds);
            paginatedIds.forEach(id => newSelected.delete(id));
            setSelectedIds(newSelected);
        } else {
            const newSelected = new Set(selectedIds);
            paginatedIds.forEach(id => newSelected.add(id));
            setSelectedIds(newSelected);
        }
    };

    const handleSelectOne = (userId: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedIds(newSelected);
    };

    const handleNotify = async (userIds: string[], credType: string) => {
        setNotifying(true);
        try {
            const response = await api.sendCredentialNotifications({
                user_ids: userIds,
                credential_type: credType
            });
            const sent = response?.notifications_sent || 0;
            toast(`Sent ${sent} notification(s)`, 'success');
            setSelectedIds(new Set());
        } catch (err) {
            const { message } = parseApiError(err as Error);
            toast(message, 'error');
        } finally {
            setNotifying(false);
        }
    };

    const handleBulkNotify = () => {
        if (selectedIds.size === 0) {
            toast('Please select at least one staff member', 'warning');
            return;
        }
        
        const selectedCreds = credentials.filter(c => selectedIds.has(c.user_id));
        const credTypes = [...new Set(selectedCreds.map(c => c.credential_type))];
        
        if (credTypes.length > 1) {
            toast('Please select credentials of the same type', 'warning');
            return;
        }
        
        handleNotify(Array.from(selectedIds), credTypes[0]);
    };

    const handleExportCSV = () => {
        const headers = ['Full Name', 'Role', 'Credential Type', 'Credential Number', 'Expiry Date', 'Days Until Expiry', 'Primary Location'];
        const rows = credentials.map(c => [
            c.full_name,
            c.role,
            c.credential_type,
            c.credential_number,
            c.expiry_date,
            c.days_until_expiry.toString(),
            c.primary_location || ''
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expiring-credentials-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const getUrgencyColor = (days: number) => {
        if (days < 7) return 'text-red-600 bg-red-50 border-red-200';
        if (days < 30) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-blue-600 bg-blue-50 border-blue-200';
    };

    const totalPages = Math.ceil(credentials.length / rowsPerPage) || 1;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedCredentials = credentials.slice(startIndex, endIndex);

    return (
        <div className="flex flex-col h-full w-full bg-white overflow-hidden">
            <CredentialsHeader
                daysThreshold={daysThreshold}
                setDaysThreshold={setDaysThreshold}
                credentialTypeFilter={credentialTypeFilter}
                setCredentialTypeFilter={setCredentialTypeFilter}
                roleFilter={roleFilter}
                setRoleFilter={setRoleFilter}
                onExport={handleExportCSV}
                onBulkNotify={handleBulkNotify}
                selectedCount={selectedIds.size}
                notifying={notifying}
                hasCredentials={credentials.length > 0}
            />

            <div className="flex-1 p-4 lg:px-10 lg:py-6 bg-slate-50/30 min-h-0 flex flex-col overflow-hidden">
                {loading ? (
                    <div className="h-full w-full flex flex-col items-center justify-center py-20">
                        <RefreshCcw size={40} className="text-rose-200 animate-spin mb-4" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Credentials...</p>
                    </div>
                ) : credentials.length === 0 ? (
                    <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
                        <div className="h-full w-full flex flex-col items-center justify-center py-20">
                            <AlertTriangle size={48} className="text-slate-300 mb-4" />
                            <p className="text-slate-500 font-medium text-sm">No expiring credentials found</p>
                            <p className="text-slate-400 text-xs mt-1">Adjust filters to see results</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">
                        <div ref={containerRef} className="flex-1 overflow-x-auto no-scrollbar relative z-10 overflow-y-hidden">
                            <table className="w-full text-left border-collapse table-auto h-full">
                                <thead className="bg-slate-50/80 text-slate-400 sticky top-0 z-10 backdrop-blur-sm h-[48px]">
                                    <tr>
                                        <th className="px-5 border-b border-slate-100">
                                            <input
                                                type="checkbox"
                                                checked={paginatedCredentials.length > 0 && paginatedCredentials.every(c => selectedIds.has(c.user_id))}
                                                onChange={handleSelectAll}
                                                className="rounded cursor-pointer"
                                            />
                                        </th>
                                        <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100">Staff Member</th>
                                        <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100">Credential Details</th>
                                        <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100">Expiration</th>
                                        <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100">Status</th>
                                        <th className="px-5 font-black text-[9px] uppercase tracking-[0.2em] border-b border-slate-100 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedCredentials.map((cred) => (
                                        <tr key={`${cred.user_id}-${cred.credential_type}`} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-5 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(cred.user_id)}
                                                    onChange={() => handleSelectOne(cred.user_id)}
                                                    className="rounded cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <p className="font-bold text-slate-800 text-sm">{cred.full_name}</p>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 w-fit">
                                                            {cred.role}
                                                        </span>
                                                        {cred.primary_location && (
                                                            <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                                                <span className="text-slate-400">📍</span>
                                                                {cred.primary_location}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <p className="font-bold text-slate-800 text-sm">{cred.credential_type}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{cred.credential_number}</p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <p className="font-semibold text-slate-700 text-sm">
                                                        {new Date(cred.expiry_date).toLocaleDateString('en-US', { 
                                                            year: 'numeric', 
                                                            month: 'short', 
                                                            day: 'numeric' 
                                                        })}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                        {cred.days_until_expiry < 0 
                                                            ? `Expired ${Math.abs(cred.days_until_expiry)} days ago`
                                                            : cred.days_until_expiry === 0
                                                            ? 'Expires today'
                                                            : cred.days_until_expiry === 1
                                                            ? 'Expires tomorrow'
                                                            : cred.days_until_expiry < 7
                                                            ? `Expires in ${cred.days_until_expiry} days`
                                                            : cred.days_until_expiry < 30
                                                            ? `Expires in ${cred.days_until_expiry} days (${Math.floor(cred.days_until_expiry / 7)} weeks)`
                                                            : cred.days_until_expiry < 365
                                                            ? `Expires in ${Math.floor(cred.days_until_expiry / 30)} months`
                                                            : `Expires in ${Math.floor(cred.days_until_expiry / 365)} years`
                                                        }
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm ${getUrgencyColor(cred.days_until_expiry)}`}>
                                                        {cred.days_until_expiry < 0 
                                                            ? '🔴 Expired'
                                                            : cred.days_until_expiry < 7 
                                                            ? '🔴 Critical'
                                                            : cred.days_until_expiry < 30 
                                                            ? '⚠️ Warning'
                                                            : '✅ Active'
                                                        }
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleNotify([cred.user_id], cred.credential_type);
                                                    }}
                                                    disabled={notifying}
                                                    className="px-4 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-95 cursor-pointer inline-flex items-center gap-2"
                                                >
                                                    <Bell size={14} />
                                                    Send Reminder
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-8 py-3 border-t border-slate-50 bg-white relative z-20 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Page <span className="text-slate-800">{currentPage}</span> of <span className="text-slate-800">{totalPages}</span>
                                </span>
                                <div className="h-4 w-px bg-slate-200"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span className="text-rose-600">{credentials.length}</span> Total Credentials
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-rose-600 hover:border-rose-200 cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4" strokeWidth={3} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 hover:text-rose-600 hover:border-rose-200 cursor-pointer"
                                >
                                    <ChevronRight className="w-4 h-4" strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
