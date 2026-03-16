'use client';

import { usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { getActiveProfile } from '@/utils/helpers';
import {
    LayoutDashboard,
    Activity,
    History,
    Settings,
    BrainCircuit,
    ShieldCheck
} from 'lucide-react';
import SidebarContainer from './SidebarContainer';
import { SidebarItem } from './parts/SidebarItem';
import { SidebarSection } from './parts/SidebarSection';

export default function Sidebar() {
    const pathname = usePathname();
    const user = useStore(state => state.user);
    const isSidebarPinned = useStore(state => state.isSidebarPinned);
    const isPatient = !!user?.is_patient;
    const isActivated = user?.is_activated === 1;
    const isAccessAllowed = isPatient && isActivated;
    const isAdmin = user?.role === 'admin';

    const navItems = [
        { name: 'Dashboard', href: '/patient/dashboard', icon: LayoutDashboard, allowed: true },
        { name: 'Classifier', href: '/patient/classifier', icon: BrainCircuit, allowed: isAccessAllowed },
        { name: 'History', href: '/patient/history', icon: History, allowed: isAccessAllowed },
        { name: 'Live Monitor', href: '/patient/monitor', icon: Activity, allowed: isAccessAllowed },
    ];

    const lockReason = !isActivated 
        ? (user?.is_activated === 0 && getActiveProfile(user)?.nik ? "Awaiting admin approval" : "Complete profile to unlock") 
        : "Access restricted";

    return (
        <SidebarContainer>
            <SidebarSection title="Main Menu" isSidebarPinned={isSidebarPinned}>
                {navItems.map((item) => (
                    <SidebarItem 
                        key={item.href}
                        name={item.name}
                        href={item.href}
                        icon={item.icon}
                        pathname={pathname}
                        isSidebarPinned={isSidebarPinned}
                        allowed={item.allowed}
                        lockReason={lockReason}
                    />
                ))}
            </SidebarSection>

            {isAdmin && (
                <SidebarSection title="Administration" isSidebarPinned={isSidebarPinned}>
                    <SidebarItem 
                        name="User Approvals"
                        href="/admin/approvals"
                        icon={ShieldCheck}
                        pathname={pathname}
                        isSidebarPinned={isSidebarPinned}
                        isDark={false}
                    />
                </SidebarSection>
            )}

            <SidebarSection title="Settings" isSidebarPinned={isSidebarPinned} showDivider={false}>
                <SidebarItem 
                    name="Profile & Settings"
                    href="/patient/profile"
                    icon={Settings}
                    pathname={pathname}
                    isSidebarPinned={isSidebarPinned}
                    showBadge={!!(user && !isPatient)}
                />
            </SidebarSection>
        </SidebarContainer>
    );
}
