'use client';

import { ReactNode, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { useProfileManager } from '@/hooks/useProfileManager';
import { User } from '@/types/user';
import SharedIdentityCard from './parts/SharedIdentityCard';
import SharedContactCard from './parts/SharedContactCard';
import SharedUsernameCard from './parts/SharedUsernameCard';
import SharedPasswordCard from './parts/SharedPasswordCard';

export interface HeaderRenderProps {
    user: User;
    isLocked: boolean;
    activeTab: 'medical' | 'security';
    setActiveTab: (tab: 'medical' | 'security') => void;
}

interface ProfileShellProps {
    openTab?: string;
    rejectionLabel?: string;
    renderHeader: (props: HeaderRenderProps) => ReactNode;
}

export default function ProfileShell({
    openTab,
    rejectionLabel = 'Your profile was not approved.',
    renderHeader,
}: ProfileShellProps) {
    const {
        user,
        loading,
        activeTab,
        setActiveTab,
        medicalForm,
        setSecurityForm,
        securityForm,
        errors,
        rejectionReason,
        isEditingMedical,
        setIsEditingMedical,
        isEditingUsername,
        setIsEditingUsername,
        isChangingPassword,
        setIsChangingPassword,
        confirmState,
        setConfirmState,
        handleMedicalChange,
        handleSecurityChange,
        handleCancelMedical,
        handleCancelUsername,
        handleCancelPassword,
        onSaveProfileClick,
        onUpdateUsernameClick,
        handleChangePassword,
        onUpdatePasswordClick,
    } = useProfileManager();

    useEffect(() => {
        if (openTab === 'security') {
            setActiveTab('security');
            setIsChangingPassword(true);
        }
    }, [openTab, setActiveTab, setIsChangingPassword]);

    if (!user) return null;

    const isApproved = user.status === 'APPROVED';
    const isPending = user.status === 'QUEUE';
    const isRejected = user.status === 'REJECTED';
    const isLocked = isApproved || isPending;

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-white relative">
            <div className="flex-1 min-h-0 overflow-y-auto border-t border-slate-100 custom-scrollbar">
                <div className="w-full min-h-full space-y-4 relative">
                    <div className="absolute inset-0 medical-grid-pattern opacity-20 pointer-events-none -z-10" />

                    <ConfirmationModal
                        isOpen={confirmState.isOpen}
                        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                        onConfirm={confirmState.action}
                        title={confirmState.title}
                        message={confirmState.message}
                        confirmText={confirmState.confirmText}
                        isDestructive={confirmState.isDestructive}
                        isLoading={loading}
                    />

                    {isRejected && rejectionReason && (
                        <div className="mx-4 mt-4 p-4 bg-rose-50 border border-rose-100 rounded-xl animate-in slide-in-from-top-2 duration-500">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 shrink-0">
                                    <AlertCircle size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-rose-800 uppercase tracking-tight">Profile Rejected</h4>
                                    <p className="text-xs font-bold text-rose-600/80 mt-0.5 leading-relaxed">
                                        {rejectionLabel} Admin reason: <span className="text-rose-700 font-black">&quot;{rejectionReason}&quot;</span>. Please update your information and save again.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {renderHeader({ user, isLocked, activeTab, setActiveTab })}

                    <div className="w-full">
                        {activeTab === 'medical' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch w-full animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                                <SharedIdentityCard
                                    isLocked={isLocked}
                                    isActivated={isApproved}
                                    rejectionReason={rejectionReason}
                                    medicalForm={medicalForm}
                                    handleMedicalChange={handleMedicalChange}
                                    errors={errors}
                                    onSaveProfileClick={onSaveProfileClick}
                                    loading={loading}
                                />
                                <SharedContactCard
                                    isLocked={isLocked}
                                    isEditingMedical={isEditingMedical}
                                    setIsEditingMedical={setIsEditingMedical}
                                    medicalForm={medicalForm}
                                    handleMedicalChange={handleMedicalChange}
                                    errors={errors}
                                    handleCancelMedical={handleCancelMedical}
                                    onSaveProfileClick={onSaveProfileClick}
                                    loading={loading}
                                />
                            </div>
                        )}
                        {activeTab === 'security' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch w-full animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                                <SharedUsernameCard
                                    user={user}
                                    isEditingUsername={isEditingUsername}
                                    setIsEditingUsername={setIsEditingUsername}
                                    securityForm={securityForm}
                                    handleSecurityChange={handleSecurityChange}
                                    errors={errors}
                                    handleCancelUsername={handleCancelUsername}
                                    onUpdateUsernameClick={onUpdateUsernameClick}
                                    loading={loading}
                                />
                                <SharedPasswordCard
                                    isChangingPassword={isChangingPassword}
                                    setIsChangingPassword={setIsChangingPassword}
                                    securityForm={securityForm}
                                    setSecurityForm={setSecurityForm}
                                    handleSecurityChange={handleSecurityChange}
                                    errors={errors}
                                    handleCancelPassword={handleCancelPassword}
                                    handleChangePassword={handleChangePassword}
                                    onUpdatePasswordClick={onUpdatePasswordClick}
                                    loading={loading}
                                />
                            </div>
                        )}
                    </div>

                    <div className="h-6 shrink-0" />
                </div>
            </div>
        </div>
    );
}
