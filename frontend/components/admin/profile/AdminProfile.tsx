'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { useToast } from '@/hooks/useToast';
import axiosInstance from '@/services/axiosInstance';
import { parseApiError } from '@/utils/helpers';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { AdminProfileCard } from './parts/AdminProfileCard';
import { SecurityCredentialsForm } from './parts/SecurityCredentialsForm';

export default function AdminProfile() {
    const user = useStore(state => state.user);
    const setUser = useStore(state => state.setUser);
    const { show: toast } = useToast();

    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [username, setUsername] = useState(user?.username || '');
    const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);

    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const [confirmAction, setConfirmAction] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        action: () => Promise<void>;
    }>({
        isOpen: false,
        title: '',
        message: '',
        action: async () => { }
    });

    const handleUpdateUsername = async () => {
        if (username === user?.username) {
            setIsEditingUsername(false);
            return;
        }

        setIsUpdatingUsername(true);
        try {

            const res = await axiosInstance.put('/auth/change-username', { new_username: username });
            setUser(res.data);
            toast("Username updated successfully", "success");
            setIsEditingUsername(false);
        } catch (error) {
            const { message } = parseApiError(error as Error);
            toast(message || "Failed to update username", "error");
            setUsername(user?.username || '');
        } finally {
            setIsUpdatingUsername(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!passwords.current || !passwords.new || !passwords.confirm) {
            toast("Please fill in all password fields", "warning");
            return;
        }
        if (passwords.new !== passwords.confirm) {
            toast("New passwords do not match", "error");
            return;
        }
        if (passwords.new.length < 8) {
            toast("Password must be at least 8 characters", "warning");
            return;
        }

        setIsUpdatingPassword(true);
        try {

            await axiosInstance.put('/auth/change-password', {
                current_password: passwords.current,
                new_password: passwords.new
            });
            toast("Password changed successfully", "success");
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (error) {
            const { message } = parseApiError(error as Error);
            toast(message || "Failed to change password", "error");
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-50/50 p-6 lg:p-8 gap-6 overflow-hidden animate-in fade-in duration-500">
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 flex flex-col gap-6 min-h-0">
                    <AdminProfileCard 
                        user={user}
                        isEditingUsername={isEditingUsername}
                        setIsEditingUsername={setIsEditingUsername}
                        username={username}
                        setUsername={setUsername}
                        handleUpdateUsername={handleUpdateUsername}
                        isUpdatingUsername={isUpdatingUsername}
                    />
                </div>

                <div className="lg:col-span-7 flex flex-col gap-6 min-h-0">
                    <SecurityCredentialsForm 
                        passwords={passwords}
                        setPasswords={setPasswords}
                        handleUpdatePassword={handleUpdatePassword}
                        isUpdatingPassword={isUpdatingPassword}
                    />
                </div>
            </div>

            <ConfirmationModal
                isOpen={confirmAction.isOpen}
                onClose={() => setConfirmAction({ ...confirmAction, isOpen: false })}
                onConfirm={confirmAction.action}
                title={confirmAction.title}
                message={confirmAction.message}
            />
        </div>
    );
}
