'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import { useStore } from '@/store/useStore';
import { useToast } from '@/hooks/useToast';

import DashboardLayout from '@/components/layout/DashboardLayout';
import OperatorSidebar from '@/components/layout/OperatorSidebar';

export default function OperatorLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useStore();
    const { show: toast } = useToast();

    useEffect(() => {
        if (user && !user.is_operator) {
            toast("Access denied. Operator only.", "error");
            const home =
                user.role === 'admin' ? '/admin/dashboard'
                : user.is_operator ? '/operator/dashboard'
                : user.is_doctor ? '/doctor/dashboard'
                : user.is_patient ? '/patient/dashboard'
                : '/dashboard';
            router.replace(home);
        }
    }, [user, router, toast]);

    useEffect(() => {
        if (user && user.is_operator && user.is_activated !== 1) {
        }
    }, [user, pathname, router, toast]);

    if (user && !user.is_operator) {
        return null;
    }

    return (
        <DashboardLayout sidebar={<OperatorSidebar />}>
            {children}
        </DashboardLayout>
    );
}
