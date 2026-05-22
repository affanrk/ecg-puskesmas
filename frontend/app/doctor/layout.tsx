'use client';

import { ReactNode, useEffect } from 'react';

import { usePathname } from 'next/navigation';

import { useRouter } from 'nextjs-toploader/app';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DoctorHeader from '@/components/layout/DoctorHeader';
import DoctorSidebar from '@/components/layout/DoctorSidebar';
import { useToast } from '@/hooks/useToast';
import { useStore } from '@/store/useStore';

export default function DoctorLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useStore();
    const { show: toast } = useToast();

    useEffect(() => {
        if (user && !user.is_doctor) {
            toast("Access denied. Doctor only.", "error");
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
        if (user && user.is_doctor && user.is_activated !== 1) {
            const protectedPaths: string[] = [];
            if (protectedPaths.some(p => pathname.startsWith(p))) {
                toast("Access restricted until activation is approved", "error");
                router.replace('/doctor/dashboard');
            }
        }
    }, [user, pathname, router, toast]);

    if (user && !user.is_doctor) {
        return null;
    }

    return (
        <DashboardLayout sidebar={<DoctorSidebar />} header={<DoctorHeader />}>
            {children}
        </DashboardLayout>
    );
}
