'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { Loader2 } from 'lucide-react';

export default function Home() {
    const router = useRouter();
    const { user } = useStore();

    useEffect(() => {
        const token = localStorage.getItem('ecg_token');
        if (!token) {
            router.replace('/login');
            return;
        }

        if (user) {
            if (user.role === 'admin') {
                router.replace('/admin/approvals');
            } else {
                router.replace('/dashboard');
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