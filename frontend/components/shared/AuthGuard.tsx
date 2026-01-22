'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { api } from '@/services/api';

export default function AuthGuard({ children }: { children: ReactNode }) {
    // 1. Hooks & State
    const router = useRouter();
    const pathname = usePathname();
    const { setUser, user: storeUser } = useStore();
    const [authorized, setAuthorized] = useState(false);

    // 2. Effects
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('ecg_token');
            const isAuthPage = pathname === '/login' || pathname === '/register';

            if (!token) {
                setAuthorized(false);
                if (!isAuthPage) {
                    router.push('/login');
                }
                return;
            }

            try {
                // If we already have the user in store, we are good (client-side nav)
                // But if it's a reload (storeUser is null), we MUST fetch from API
                // to get the FULL profile (localStorage might only have partial data from login)
                if (!storeUser) {
                    const userData = await api.fetchUserProfile(token);
                    setUser(userData);
                    // Update LS to keep it somewhat fresh, though we rely on API for completeness
                    localStorage.setItem('ecg_user', JSON.stringify(userData));
                }

                setAuthorized(true);
            } catch (error) {
                console.error("Session verification failed:", error);
                // If fetch fails (e.g. 401), clear session and redirect
                localStorage.removeItem('ecg_token');
                localStorage.removeItem('ecg_user');
                setAuthorized(false);
                if (!isAuthPage) router.push('/login');
            }
        };

        checkAuth();
    }, [pathname, router, setUser, storeUser]);

    // 3. Render
    if (pathname === '/login' || pathname === '/register') {
        return <>{children}</>;
    }

    if (!authorized) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-brand-500 animate-spin mb-4" />
                <p className="text-slate-500 font-medium">Verifying Session...</p>
            </div>
        );
    }

    return <>{children}</>;
}