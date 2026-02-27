'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { api } from '@/services/api';
import { User } from '@/store/useStore';
import { connectWebSocket } from '@/services/socket';

export default function AuthGuard({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { setUser, user: storeUser } = useStore();
    const [authorized, setAuthorized] = useState(false);
    const redirectingRef = useRef(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as { __is_logging_out?: boolean } & Window).__is_logging_out) {
            return;
        }

        const isAuthPage = pathname === '/login' || pathname === '/register';

        if (isAuthPage) {
            if (authorized) {
                setTimeout(() => setAuthorized(false), 0);
            }
            redirectingRef.current = false;
            return;
        }

        const enforceRouting = (userData: User) => {
            const role = userData.role;
            const isPatient = userData.is_patient;
            const isOperator = userData.is_operator;
            const isDoctor = userData.is_doctor;

            const isDashboardRoute = pathname === '/dashboard';
            const isOnboarding = pathname.startsWith('/onboarding');
            const isPatientRoute = pathname.startsWith('/patient');
            const isOperatorRoute = pathname.startsWith('/operator');
            const isDoctorRoute = pathname.startsWith('/doctor');
            const isAdminRoute = pathname.startsWith('/admin');

            const hasRole = isPatient || isOperator || isDoctor || role === 'admin';

            if (!hasRole && !isOnboarding && !isDashboardRoute) {
                if (!redirectingRef.current) {
                    redirectingRef.current = true;
                    router.replace('/dashboard');
                }
                return false;
            }

            if (hasRole) {
                if (role === 'admin' && !isAdminRoute) {
                    if (!redirectingRef.current) {
                        redirectingRef.current = true;
                        router.replace('/admin/dashboard');
                    }
                    return false;
                }
                
                if (role !== 'admin') {
                    if (isPatient && !isPatientRoute) {
                        if (!redirectingRef.current) {
                            redirectingRef.current = true;
                            router.replace('/patient/dashboard');
                        }
                        return false;
                    }
                    if (isOperator && !isOperatorRoute) {
                        if (!redirectingRef.current) {
                            redirectingRef.current = true;
                            router.replace('/operator/dashboard');
                        }
                        return false;
                    }
                    if (isDoctor && !isDoctorRoute) {
                        if (!redirectingRef.current) {
                            redirectingRef.current = true;
                            router.replace('/doctor/dashboard');
                        }
                        return false;
                    }
                }
            }
            return true;
        };

        if (storeUser) {
            const canProceed = enforceRouting(storeUser);
            if (canProceed && !authorized) {
                setTimeout(() => setAuthorized(true), 0);
                connectWebSocket();
            }
            return;
        }

        const token = localStorage.getItem('ecg_token');
        if (!token) {
            const wasAuthorized = authorized;
            if (authorized) {
                setTimeout(() => setAuthorized(false), 0);
            }
            
            if (!isAuthPage && !redirectingRef.current) {
                redirectingRef.current = true;
                const url = wasAuthorized ? '/login?reason=expired' : '/login';
                router.replace(url);
            }
            return;
        }

        const checkAuth = async () => {
            try {
                const userData = await api.fetchUserProfile(token);
                setUser(userData);
                localStorage.setItem('ecg_user', JSON.stringify(userData));
                
                const canProceed = enforceRouting(userData);
                if (canProceed && !authorized) {
                    setTimeout(() => setAuthorized(true), 0);
                    connectWebSocket();
                }
            } catch (error) {
                console.error("Session verification failed:", error);
                localStorage.removeItem('ecg_token');
                localStorage.removeItem('ecg_user');
                setUser(null);
                if (authorized) {
                    setTimeout(() => setAuthorized(false), 0);
                }
                if (!isAuthPage && !redirectingRef.current) {
                    redirectingRef.current = true;
                    router.replace('/login?reason=expired');
                }
            }
        };

        checkAuth();
    }, [pathname, router, setUser, authorized, storeUser]);

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
