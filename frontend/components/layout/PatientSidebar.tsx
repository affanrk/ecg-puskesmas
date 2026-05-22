'use client';

import { usePathname } from 'next/navigation';

import {
    LayoutDashboard,
    Activity,
    History,
    BrainCircuit,
    Settings
} from 'lucide-react';

import { SidebarItem } from './parts/SidebarItem';
import { SidebarSection } from './parts/SidebarSection';
import { CollapsibleSidebarSection } from './parts/CollapsibleSidebarSection';
import SidebarContainer from './SidebarContainer';
import { useStore } from '@/store/useStore';
import { getActiveProfile } from '@/utils/helpers';

export default function PatientSidebar() {
    const pathname = usePathname();
    const user = useStore(state => state.user);
    const isSidebarPinned = useStore(state => state.isSidebarPinned);
    const isPatient = !!user?.is_patient;
    const isActivated = user?.is_activated === 1;
    const isAccessAllowed = isPatient && isActivated;

    const lockReason = !isActivated
        ? (user?.is_activated === 0 && getActiveProfile(user)?.nik ? "Awaiting admin approval" : "Complete profile to unlock")
        : "Access restricted";

    return (
        <SidebarContainer>
            <SidebarSection title="Overview" isSidebarPinned={isSidebarPinned}>
                <SidebarItem
                    name="Dashboard"
                    href="/patient/dashboard"
                    icon={LayoutDashboard}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                />
            </SidebarSection>

            <CollapsibleSidebarSection
                title="Health Services"
                isSidebarPinned={isSidebarPinned}
                defaultExpanded={true}
                storageKey="patient-sidebar-services"
            >
                <SidebarItem
                    name="Classifier"
                    href="/patient/classifier"
                    icon={BrainCircuit}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    allowed={isAccessAllowed}
                    lockReason={lockReason}
                />
                <SidebarItem
                    name="History"
                    href="/patient/history"
                    icon={History}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    allowed={isAccessAllowed}
                    lockReason={lockReason}
                />
                <SidebarItem
                    name="Live Monitor"
                    href="/patient/monitor"
                    icon={Activity}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    allowed={isAccessAllowed}
                    lockReason={lockReason}
                />
            </CollapsibleSidebarSection>

            <SidebarSection title="Account" isSidebarPinned={isSidebarPinned} showDivider={false}>
                <SidebarItem
                    name="Profile & Settings"
                    href="/patient/profile"
                    icon={Settings}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                />
            </SidebarSection>
        </SidebarContainer>
    );
}
