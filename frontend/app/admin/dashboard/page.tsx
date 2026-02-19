'use client';

import { LayoutDashboard } from 'lucide-react';
import ComingSoon from '@/components/shared/ComingSoon';

export default function AdminDashboard() {
    return (
        <div className="h-full bg-white flex flex-col items-center justify-center">
            <ComingSoon 
                title="Admin Dashboard" 
                description="The administrative dashboard for advanced user management, system-wide analytics, and audit tracking is currently under heavy development. Please check back soon for live management tools."
                icon={LayoutDashboard}
                color="rose"
            />
        </div>
    );
}
