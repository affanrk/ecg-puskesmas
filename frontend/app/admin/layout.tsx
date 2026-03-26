'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { useStore } from '@/store/useStore';
import { useToast } from '@/hooks/useToast';

import DashboardLayout from '@/components/layout/DashboardLayout';
import AdminSidebar from '@/components/layout/AdminSidebar';
import AdminHeader from '@/components/layout/AdminHeader';

export default function AdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { user } = useStore();
    const { show: toast } = useToast();

    useEffect(() => {
        if (user && user.role !== 'admin') {
            toast("Access denied. Admin only.", "error");
            router.replace('/patient/dashboard');
        }
    }, [user, router, toast]);

    if (user && user.role !== 'admin') {
        return null;
    }

    return (
        <DashboardLayout 
            sidebar={<AdminSidebar />}
            header={<AdminHeader />}
        >
            {children}
        </DashboardLayout>
    );
}
