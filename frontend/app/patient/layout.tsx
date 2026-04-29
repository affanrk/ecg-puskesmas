'use client';

import { ReactNode, useEffect } from 'react';

import { usePathname } from 'next/navigation';

import { useRouter } from 'nextjs-toploader/app';

import DashboardLayout from '@/components/layout/DashboardLayout';
import PatientHeader from '@/components/layout/PatientHeader';
import PatientSidebar from '@/components/layout/PatientSidebar';
import { useToast } from '@/hooks/useToast';
import { useStore } from '@/store/useStore';

export default function PatientLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useStore();
    const { show: toast } = useToast();

    useEffect(() => {
        if (user && !user.is_patient) {
            toast("Access denied. Patient only.", "error");
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
        if (user && user.is_patient && user.is_activated !== 1) {
            const protectedPaths = ['/patient/monitor', '/patient/history', '/patient/classifier'];
            if (protectedPaths.some(p => pathname.startsWith(p))) {
                toast("Access restricted until activation is approved", "error");
                router.replace('/patient/dashboard');
            }
        }
    }, [user, pathname, router, toast]);

    if (user && !user.is_patient) {
        return null;
    }

    return (
        <DashboardLayout sidebar={<PatientSidebar />} header={<PatientHeader />}>
            {children}
        </DashboardLayout>
    );
}
