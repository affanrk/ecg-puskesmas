'use client';

import ConfirmationModal from '@/components/shared/ConfirmationModal';
import ProfileHeader from '@/components/profile/ProfileHeader';
import IdentityCard from '@/components/profile/IdentityCard';
import ContactCard from '@/components/profile/ContactCard';
import UsernameCard from '@/components/profile/UsernameCard';
import PasswordCard from '@/components/profile/PasswordCard';
import { useProfileManager } from '@/hooks/useProfileManager';

export default function ProfilePage() {
    // 1. Hooks & State
    const {
        user,
        loading,
        activeTab,
        setActiveTab,
        medicalForm,
        setMedicalForm,
        securityForm,
        setSecurityForm,
        errors,
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
        onUpdatePasswordClick
    } = useProfileManager();

    // 2. Conditional Render & Computed
    if (!user) return null;
    const isLocked = user.is_patient;

    // 3. Render
    return (
        <div className="w-full min-h-full space-y-4 relative">
            
            {/* Subtle Medical Background Pattern for the Page Area */}
            <div className="absolute inset-0 medical-grid-pattern opacity-20 pointer-events-none -z-10"></div>

            <ConfirmationModal
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmState.action}
                title={confirmState.title}
                message={confirmState.message}
                isDestructive={confirmState.isDestructive}
                isLoading={loading}
            />

            <ProfileHeader
                user={user}
                isLocked={isLocked}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
            />

            {/* CONTENT AREA */}
            <div className="w-full">
                {/* ... existing tab logic ... */}
                {activeTab === 'medical' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch w-full animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                        <IdentityCard
                            isLocked={isLocked}
                            medicalForm={medicalForm}
                            handleMedicalChange={handleMedicalChange}
                            errors={errors}
                            onSaveProfileClick={onSaveProfileClick}
                            loading={loading}
                        />
                        <ContactCard
                            isLocked={isLocked}
                            isEditingMedical={isEditingMedical}
                            setIsEditingMedical={setIsEditingMedical}
                            medicalForm={medicalForm}
                            setMedicalForm={setMedicalForm}
                            handleMedicalChange={handleMedicalChange}
                            errors={errors}
                            handleCancelMedical={handleCancelMedical}
                            onSaveProfileClick={onSaveProfileClick}
                            loading={loading}
                        />
                    </div>
                )}

                {/* TAB: SECURITY */}
                {activeTab === 'security' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch w-full animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                        <UsernameCard
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
                        <PasswordCard
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

            {/* Bottom Spacer */}
            <div className="h-6 shrink-0" />
        </div>
    );
}