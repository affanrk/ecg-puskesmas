'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const { show: toast } = useToast();

    useEffect(() => {
        const checkAuth = () => {
            const token = localStorage.getItem('ecg_token');
            const userStr = localStorage.getItem('ecg_user');
            
            if (!token || !userStr) {
                setAuthorized(false);
                if (pathname !== '/login' && pathname !== '/register') {
                    toast("Please login to continue", "warning");
                    router.push('/login');
                }
                return;
            }

            try {
                const user = JSON.parse(userStr);
                const role = user.role?.toLowerCase();

                if (role === 'user') {
                    setAuthorized(true);
                } else if (['admin', 'doctor', 'nurse', 'operator'].includes(role)) {
                    if (pathname !== '/coming-soon') {
                        toast("Access restricted for your role", "warning");
                        router.push('/coming-soon');
                    } else {
                        setAuthorized(true);
                    }
                } else {
                    setAuthorized(true); 
                }
            } catch (e) {
                localStorage.removeItem('ecg_token');
                localStorage.removeItem('ecg_user');
                setAuthorized(false);
                toast("Session expired", "error");
                router.push('/login');
            }
        };

        checkAuth();
    }, [pathname, router]);

    if (pathname === '/login' || pathname === '/register') {
        return <>{children}</>;
    }

    if (!authorized) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 font-sans">
                <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium animate-pulse">Verifying Session...</p>
            </div>
        );
    }

    return <>{children}</>;
}
