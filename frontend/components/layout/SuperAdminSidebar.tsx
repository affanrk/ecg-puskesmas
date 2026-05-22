'use client';

import { usePathname } from 'next/navigation';

import {
    LayoutDashboard,
    MapPin,
    ShieldCheck,
    Users
} from 'lucide-react';

import { SidebarItem } from './parts/SidebarItem';
import { SidebarSection } from './parts/SidebarSection';
import { CollapsibleSidebarSection } from './parts/CollapsibleSidebarSection';
import SidebarContainer from './SidebarContainer';
import { useStore } from '@/store/useStore';

export default function SuperAdminSidebar() {
    const pathname = usePathname();
    const isSidebarPinned = useStore(state => state.isSidebarPinned);

    return (
        <SidebarContainer className="bg-slate-900 border-slate-800 theme-violet">
            <SidebarSection title="Overview" isSidebarPinned={isSidebarPinned}>
                <SidebarItem
                    name="Dashboard"
                    href="/superadmin/dashboard"
                    icon={LayoutDashboard}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                    variant="violet"
                />
            </SidebarSection>

            <CollapsibleSidebarSection
                title="System Management"
                isSidebarPinned={isSidebarPinned}
                defaultExpanded={true}
                storageKey="superadmin-sidebar-system"
                showDivider={false}
            >
                <SidebarItem
                    name="Location Management"
                    href="/superadmin/locations"
                    icon={MapPin}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                    variant="violet"
                />
                <SidebarItem
                    name="Admin Management"
                    href="/superadmin/admins"
                    icon={ShieldCheck}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                    variant="violet"
                />
                <SidebarItem
                    name="Global User"
                    href="/superadmin/users"
                    icon={Users}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                    variant="violet"
                />
            </CollapsibleSidebarSection>
        </SidebarContainer>
    );
}
