'use client';

import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import {
    LayoutDashboard,
    Activity,
    ShieldCheck,
    UserCircle,
    Users
} from 'lucide-react';
import SidebarContainer from './SidebarContainer';
import { SidebarItem } from './parts/SidebarItem';
import { SidebarSection } from './parts/SidebarSection';

export default function AdminSidebar() {
    const pathname = usePathname();
    const isSidebarPinned = useStore(state => state.isSidebarPinned);

    return (
        <SidebarContainer className="bg-slate-900 border-slate-800">
            <SidebarSection title="Security & Control" isSidebarPinned={isSidebarPinned}>
                <SidebarItem
                    name="Dashboard"
                    href="/admin/dashboard"
                    icon={LayoutDashboard}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                />
                <SidebarItem
                    name="User Approvals"
                    href="/admin/approvals"
                    icon={ShieldCheck}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    isDark={true}
                />
                <SidebarItem
                    name="User Management"
                    href="/admin/users"
                    icon={Users}
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
            </SidebarSection>

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
