'use client';

import { useEffect, useState, useRef, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import { Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { api } from '@/services/api';
import ChangePasswordModal from '@/components/shared/ChangePasswordModal';
import { User } from '@/types/user';
import { connectWebSocket } from '@/services/socket';

export default function AuthGuard({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const setUser = useStore(state => state.setUser);
    const storeUser = useStore(state => state.user);
    const isSidebarPinned = useStore(state => state.isSidebarPinned);
    const [isChangeOpen, setIsChangeOpen] = useState(false);
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
            const unlockOperator = process.env.NEXT_PUBLIC_UNLOCK_OPERATOR === '1' || process.env.NEXT_PUBLIC_UNLOCK_OPERATOR === 'true';

            const isDashboardRoute = pathname === '/dashboard';
            const isOnboarding = pathname.startsWith('/onboarding');
            const isPatientRoute = pathname.startsWith('/patient');
            const isOperatorRoute = pathname.startsWith('/operator');
            const isDoctorRoute = pathname.startsWith('/doctor');
            const isAdminRoute = pathname.startsWith('/admin');
            const isSuperadminRoute = pathname.startsWith('/superadmin');

            if (unlockOperator && isOperatorRoute) {
                return true;
            }

            const hasRole = isPatient || isOperator || isDoctor || role === 'admin' || role === 'superadmin';

            if (!hasRole && !isOnboarding && !isDashboardRoute) {
                if (!redirectingRef.current) {
                    redirectingRef.current = true;
                    router.replace('/dashboard');
                }
                return false;
            }

            if (hasRole) {
                if (role === 'superadmin' && !isSuperadminRoute) {
                    if (!redirectingRef.current) {
                        redirectingRef.current = true;
                        router.replace('/superadmin/dashboard');
                    }
                    return false;
                }
                if (role === 'admin' && !isAdminRoute) {
                    if (!redirectingRef.current) {
                        redirectingRef.current = true;
                        router.replace('/admin/dashboard');
                    }
                    return false;
                }
                
                if (role !== 'admin' && role !== 'superadmin') {
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

    const currentUser = storeUser as User | null;
    if (currentUser && currentUser.must_reset_password === 1) {
        const leftOffset = isSidebarPinned ? '18rem' : '0.5rem';

        return (
            <>
                <div
                    style={{ left: leftOffset }}
                    className="fixed top-4 right-4 z-[80] w-[calc(100%-4rem)] max-w-3xl pointer-events-auto"
                >
                    <div className="rounded-lg shadow-2xl bg-amber-50 border border-amber-200 ring-1 ring-amber-300 p-4 flex items-center justify-between gap-4 animate-pulse">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-100 rounded-md flex items-center justify-center text-amber-700 shadow-inner">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0-1.657-1.343-3-3-3S6 9.343 6 11s1.343 3 3 3 3-1.343 3-3zM19 11c0-1.657-1.343-3-3-3s-3 1.343-3 3 1.343 3 3 3 3-1.343 3-3z"/></svg>
                            </div>
                            <div>
                                <p className="text-sm font-extrabold text-amber-800">Password reset required</p>
                                <p className="text-xs text-amber-700">For security, you must change your password before continuing.</p>
                            </div>
                        </div>
                        <div>
                            <button onClick={() => setIsChangeOpen(true)} className="px-3 py-2 rounded-md bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold shadow cursor-pointer">Change password</button>
                        </div>
                    </div>
                </div>
                {children}

                <ChangePasswordModal
                    isOpen={isChangeOpen}
                    onClose={() => setIsChangeOpen(false)}
                    onSuccess={() => {}}
                />
            </>
        );
    }

    return <>{children}</>;
}
