'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { api } from '@/services/api';

export default function AuthGuard({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { setUser, user: storeUser } = useStore();
    const [authorized, setAuthorized] = useState(false);
    const isMounted = useRef(false);

    useEffect(() => {
        const checkAuth = async () => {
            if (isMounted.current) return;
            isMounted.current = true;

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
                if (!storeUser) {
                    const userData = await api.fetchUserProfile(token);
                    setUser(userData);
                    localStorage.setItem('ecg_user', JSON.stringify(userData));
                }

                setAuthorized(true);
            } catch (error) {
                console.error("Session verification failed:", error);
                localStorage.removeItem('ecg_token');
                localStorage.removeItem('ecg_user');
                setAuthorized(false);
                if (!isAuthPage) router.push('/login');
            }
        };

        checkAuth();
    }, [pathname, router, setUser, storeUser]);

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
