'use client';

import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import SidebarContainer from './SidebarContainer';
import { SidebarItem } from './parts/SidebarItem';
import { SidebarSection } from './parts/SidebarSection';
import { LayoutDashboard, Activity, Settings } from 'lucide-react';
import { getActiveProfile } from '@/utils/helpers';

export default function OperatorSidebar() {
    const pathname = usePathname();
    const user = useStore(state => state.user);
    const isSidebarPinned = useStore(state => state.isSidebarPinned);
    const isOperator = !!user?.is_operator;
    const isActivated = user?.is_activated === 1;
    const isAccessAllowed = isOperator && isActivated;
    const lockReason = !isActivated
        ? (user?.is_activated === 0 && getActiveProfile(user)?.nik ? 'Awaiting admin approval' : 'Complete profile to unlock')
        : 'Access restricted';

    return (
        <SidebarContainer className="theme-amber">
            <SidebarSection title="Operator Menu" isSidebarPinned={isSidebarPinned}>
                <SidebarItem
                    name="Dashboard"
                    href="/operator/dashboard"
                    icon={LayoutDashboard}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    variant="amber"
                />
                <SidebarItem
                    name="Live Monitor"
                    href="/operator/monitor"
                    icon={Activity}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    allowed={isAccessAllowed}
                    lockReason={lockReason}
                    variant="amber"
                />
            </SidebarSection>
            <SidebarSection title="Settings" isSidebarPinned={isSidebarPinned} showDivider={false}>
                <SidebarItem
                    name="Profile & Settings"
                    href="/operator/profile"
                    icon={Settings}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    variant="amber"
                />
            </SidebarSection>
        </SidebarContainer>
    );
}
