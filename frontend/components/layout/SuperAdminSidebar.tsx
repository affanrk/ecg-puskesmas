'use client';

import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import {
    LayoutDashboard,
    MapPin,
    ShieldCheck,
    Users
} from 'lucide-react';
import SidebarContainer from './SidebarContainer';
import { SidebarItem } from './parts/SidebarItem';
import { SidebarSection } from './parts/SidebarSection';

export default function SuperAdminSidebar() {
    const pathname = usePathname();
    const isSidebarPinned = useStore(state => state.isSidebarPinned);

    return (
        <SidebarContainer className="bg-slate-900 border-slate-800 theme-violet">
            <SidebarSection title="Global Control" isSidebarPinned={isSidebarPinned}>
                <SidebarItem
                    name="Global Dashboard"
                    href="/superadmin/dashboard"
                    icon={LayoutDashboard}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                    variant="violet"
                />
                <SidebarItem
                    name="Locations"
                    href="/superadmin/locations"
                    icon={MapPin}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                    variant="violet"
                />
                <SidebarItem
                    name="Admin Users"
                    href="/superadmin/admins"
                    icon={ShieldCheck}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                    variant="violet"
                />
                <SidebarItem
                    name="All Users"
                    href="/superadmin/users"
                    icon={Users}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                    variant="violet"
                />
            </SidebarSection>
        </SidebarContainer>
    );
}
