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

    const navItems = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'User Approvals', href: '/admin/approvals', icon: ShieldCheck },
        { name: 'User Management', href: '/admin/users', icon: Users },
        { name: 'System Health', href: '/admin/health', icon: Activity },
    ];

    return (
        <SidebarContainer className="bg-slate-900 border-slate-800">
            <SidebarSection title="Security & Control" isSidebarPinned={isSidebarPinned}>
                {navItems.map((item) => (
                    <SidebarItem 
                        key={item.href}
                        name={item.name}
                        href={item.href}
                        icon={item.icon}
                        pathname={pathname}
                        isSidebarPinned={isSidebarPinned}
                        isDark={true}
                    />
                ))}
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
