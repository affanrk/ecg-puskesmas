'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { useStore } from '@/store/useStore';
import { useToast } from '@/hooks/useToast';

import DashboardLayout from '@/components/layout/DashboardLayout';
import SuperAdminSidebar from '@/components/layout/SuperAdminSidebar';
import SuperAdminHeader from '@/components/layout/SuperAdminHeader';

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const { user } = useStore();
    const { show: toast } = useToast();

    useEffect(() => {
        if (user && user.role !== 'superadmin') {
            toast("Access denied. SuperAdmin only.", "error");
            const home =
                user.role === 'admin' ? '/admin/dashboard'
                    : user.is_operator ? '/operator/dashboard'
                        : user.is_doctor ? '/doctor/dashboard'
                            : user.is_patient ? '/patient/dashboard'
                                : '/dashboard';
            router.replace(home);
        }
    }, [user, router, toast]);

    if (user && user.role !== 'superadmin') {
        return null;
    }

    return (
        <DashboardLayout 
            sidebar={<SuperAdminSidebar />}
            header={<SuperAdminHeader />}
        >
            {children}
        </DashboardLayout>
    );
}
