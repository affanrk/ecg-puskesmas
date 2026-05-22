import { Download, Bell } from 'lucide-react';
import SelectInput from '@/components/shared/SelectInput';

interface CredentialsHeaderProps {
    daysThreshold: string;
    setDaysThreshold: (value: string) => void;
    credentialTypeFilter: string;
    setCredentialTypeFilter: (value: string) => void;
    roleFilter: string;
    setRoleFilter: (value: string) => void;
    onExport: () => void;
    onBulkNotify: () => void;
    selectedCount: number;
    notifying: boolean;
    hasCredentials: boolean;
}

export default function CredentialsHeader({
    daysThreshold,
    setDaysThreshold,
    credentialTypeFilter,
    setCredentialTypeFilter,
    roleFilter,
    setRoleFilter,
    onExport,
    onBulkNotify,
    selectedCount,
    notifying,
    hasCredentials
}: CredentialsHeaderProps) {
    return (
        <div className="h-[64px] shrink-0 border-b border-slate-100 flex items-center px-8 bg-slate-50/50 gap-8">
            <div className="flex items-center gap-4 h-full shrink-0">
                <div className="w-40">
                    <SelectInput
                        label=""
                        value={daysThreshold}
                        onChange={(e) => setDaysThreshold(e.target.value)}
                        options={[
                            { value: '7', label: 'Expiring in 7 days' },
                            { value: '14', label: 'Expiring in 14 days' },
                            { value: '30', label: 'Expiring in 30 days' },
                            { value: '60', label: 'Expiring in 60 days' },
                            { value: '90', label: 'Expiring in 90 days' },
                        ]}
                        placeholder="Select Days Threshold"
                        colorTheme="rose"
                    />
                </div>
                <div className="w-40">
                    <SelectInput
                        label=""
                        value={credentialTypeFilter}
                        onChange={(e) => setCredentialTypeFilter(e.target.value)}
                        options={[
                            { value: '', label: 'All Credential Types' },
                            { value: 'STR', label: 'STR Only' },
                            { value: 'SIP', label: 'SIP Only' },
                        ]}
                        placeholder="Select Credential Type"
                        colorTheme="rose"
                    />
                </div>
                <div className="w-40">
                    <SelectInput
                        label=""
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        options={[
                            { value: '', label: 'All Staff Roles' },
                            { value: 'operator', label: 'Operators Only' },
                            { value: 'doctor', label: 'Doctors Only' },
                        ]}
                        placeholder="Select Staff Role"
                        colorTheme="rose"
                    />
                </div>
            </div>

            <div className="w-px h-6 bg-slate-200 shrink-0" />

            <div className="flex-1 flex items-center justify-end min-w-0 gap-2">
                <button
                    onClick={onExport}
                    disabled={!hasCredentials}
                    className="flex items-center gap-2 px-4 h-[42px] bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download size={16} />
                    <span>Export</span>
                </button>
                <button
                    onClick={onBulkNotify}
                    disabled={selectedCount === 0 || notifying}
                    className="flex items-center gap-2 px-4 h-[42px] bg-slate-900 hover:bg-rose-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Bell size={16} />
                    <span>Notify ({selectedCount})</span>
                </button>
            </div>
        </div>
    );
}
