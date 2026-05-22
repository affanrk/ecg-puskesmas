'use client';

import { useState, useRef, useEffect } from 'react';

import { usePathname } from 'next/navigation';

import { MapPin } from 'lucide-react';

import { RecordingIndicator } from './parts/RecordingIndicator';
import { UserMenu } from './parts/UserMenu';
import ConfirmationModal from '@/components/shared/ConfirmationModal';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { api } from '@/services';
import { LocationResponse } from '@/types/user';

export default function DoctorHeader() {
    const pathname = usePathname();
    const user = useStore(state => state.user);
    const isRecording = useStore(state => state.isRecording);
    const { logout } = useAuth();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [doctorLocation, setDoctorLocation] = useState<LocationResponse | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const isProfileComplete = !!user?.is_doctor;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchDoctorLocation = async () => {
            try {
                let locationId = user?.doctor_profile?.location_id;

                if (!locationId && user?.location_assignments && user.location_assignments.length > 0) {
                    const primaryLocation = user.location_assignments.find(loc => loc.is_primary);
                    locationId = primaryLocation?.location_id || user.location_assignments[0].location_id;
                }

                if (locationId) {
                    const locations = await api.fetchPublicLocations();
                    const locationsData = Array.isArray(locations) ? locations : locations?.data || [];
                    const location = locationsData.find((loc: LocationResponse) => loc.id === locationId);
                    if (location) {
                        setDoctorLocation(location);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch doctor location", error);
            }
        };
        if (user) {
            fetchDoctorLocation();
        }
    }, [user]);

    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        await logout();
    };

    const getPageTitle = (path: string) => {
        if (path.includes('/doctor/dashboard')) return 'Doctor Dashboard';
        if (path.includes('/doctor/profile')) return 'Doctor Profile';
        return 'Doctor Portal';
    };

    return (
        <>
            <header className="h-[64px] bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-8 flex items-center justify-between shrink-0 relative z-50 sticky top-0">
                <div className="flex items-center gap-4 flex-1 lg:pl-0 pl-12">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight hidden md:block">
                            {getPageTitle(pathname)}
                        </h2>
                        <span className="hidden md:flex items-center justify-center px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">
                            Doctor
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-5">
                    {isRecording && <RecordingIndicator />}

                    {doctorLocation && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50/80 border border-rose-200/60 text-rose-700 shadow-sm">
                            <MapPin size={14} className="shrink-0 text-rose-600" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-wider leading-none">
                                    {doctorLocation.name}
                                </span>
                                <span className="text-[8px] font-medium text-rose-600/70 uppercase tracking-widest leading-none mt-0.5">
                                    Your Location
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="w-px h-8 bg-slate-200 hidden md:block" />
                    <UserMenu
                        user={user}
                        isUserMenuOpen={isUserMenuOpen}
                        setIsUserMenuOpen={setIsUserMenuOpen}
                        setShowLogoutConfirm={setShowLogoutConfirm}
                        menuRef={menuRef}
                        isProfileComplete={isProfileComplete}
                        profileLink="/doctor/profile"
                    />
                </div>
            </header>
            <ConfirmationModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="Confirm Logout"
                message="Are you sure you want to end your session and logout from the system?"
                confirmText="Logout"
                isDestructive={true}
                isLoading={isLoggingOut}
            />
        </>
    );
}
