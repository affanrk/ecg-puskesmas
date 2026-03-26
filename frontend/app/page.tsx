'use client';

import { useEffect } from 'react';
import { useRouter } from 'nextjs-toploader/app';
import { Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function Home() {
    const router = useRouter();
    const { user } = useStore();

    useEffect(() => {
        if (user) {
            if (user.role === 'admin') {
                router.replace('/admin/dashboard');
            } else if (user.is_patient) {
                router.replace('/patient/dashboard');
            } else if (user.is_operator) {
                router.replace('/operator/dashboard');
            } else if (user.is_doctor) {
                router.replace('/doctor/dashboard');
            } else {
                router.replace('/onboarding');
            }
        }
    }, [user, router]);

    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Redirecting...</p>
        </div>
    );
}
