'use client';

import { usePathname } from 'next/navigation';

import { LayoutDashboard, Settings } from 'lucide-react';

import { SidebarItem } from './parts/SidebarItem';
import { SidebarSection } from './parts/SidebarSection';
import SidebarContainer from './SidebarContainer';
import { useStore } from '@/store/useStore';
import { getActiveProfile } from '@/utils/helpers';

export default function DoctorSidebar() {
    const pathname = usePathname();
    const user = useStore(state => state.user);
    const isSidebarPinned = useStore(state => state.isSidebarPinned);
    const isDoctor = !!user?.is_doctor;
    const isActivated = user?.is_activated === 1;
    const isAccessAllowed = isDoctor && isActivated;
    const lockReason = !isActivated
        ? (user?.is_activated === 0 && getActiveProfile(user)?.nik ? 'Awaiting admin approval' : 'Complete profile to unlock')
        : 'Access restricted';

    return (
        <SidebarContainer className="theme-rose">
            <SidebarSection title="Doctor Menu" isSidebarPinned={isSidebarPinned}>
                <SidebarItem
                    name="Dashboard"
                    href="/doctor/dashboard"
                    icon={LayoutDashboard}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    variant="rose"
                />
            </SidebarSection>
            <SidebarSection title="Settings" isSidebarPinned={isSidebarPinned} showDivider={false}>
                <SidebarItem
                    name="Profile & Settings"
                    href="/doctor/profile"
                    icon={Settings}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    variant="rose"
                />
            </SidebarSection>
        </SidebarContainer>
    );
}
