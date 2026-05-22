'use client';

import { usePathname } from 'next/navigation';

import {
    LayoutDashboard,
    Activity,
    ShieldCheck,
    UserCircle,
    Users,
    MapPin,
    BadgeCheck,
    UserCog
} from 'lucide-react';

import { SidebarItem } from './parts/SidebarItem';
import { SidebarSection } from './parts/SidebarSection';
import { CollapsibleSidebarSection } from './parts/CollapsibleSidebarSection';
import SidebarContainer from './SidebarContainer';
import { useStore } from '@/store/useStore';

export default function AdminSidebar() {
    const pathname = usePathname();
    const isSidebarPinned = useStore(state => state.isSidebarPinned);

    return (
        <SidebarContainer className="bg-slate-900 border-slate-800">
            <SidebarSection title="Overview" isSidebarPinned={isSidebarPinned}>
                <SidebarItem
                    name="Dashboard"
                    href="/admin/dashboard"
                    icon={LayoutDashboard}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                />
            </SidebarSection>

            <CollapsibleSidebarSection
                title="User & Staff Management"
                isSidebarPinned={isSidebarPinned}
                defaultExpanded={true}
                storageKey="admin-sidebar-user-staff"
            >
                <SidebarItem
                    name="User Management"
                    href="/admin/users"
                    icon={Users}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                />
                <SidebarItem
                    name="Staff Management"
                    href="/admin/staff"
                    icon={UserCog}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                />
            </CollapsibleSidebarSection>

            <CollapsibleSidebarSection
                title="Approvals & Requests"
                isSidebarPinned={isSidebarPinned}
                defaultExpanded={true}
                storageKey="admin-sidebar-approvals"
            >
                <SidebarItem
                    name="User Approvals"
                    href="/admin/approvals"
                    icon={ShieldCheck}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                />
                <SidebarItem
                    name="Location Requests"
                    href="/admin/location-requests"
                    icon={MapPin}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                />
            </CollapsibleSidebarSection>

            <CollapsibleSidebarSection
                title="Compliance & Monitoring"
                isSidebarPinned={isSidebarPinned}
                defaultExpanded={true}
                storageKey="admin-sidebar-compliance"
            >
                <SidebarItem
                    name="Credential Tracking"
                    href="/admin/credentials"
                    icon={BadgeCheck}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                />
                <SidebarItem
                    name="System Health"
                    href="/admin/health"
                    icon={Activity}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                />
            </CollapsibleSidebarSection>

            <SidebarSection title="Account" isSidebarPinned={isSidebarPinned} showDivider={false}>
                <SidebarItem
                    name="Profile & Settings"
                    href="/admin/profile"
                    icon={UserCircle}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                />
            </SidebarSection>
        </SidebarContainer>
    );
}
