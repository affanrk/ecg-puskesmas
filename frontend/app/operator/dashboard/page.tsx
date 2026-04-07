'use client';

import ComingSoon from '@/components/shared/ComingSoon';
import { LayoutDashboard } from 'lucide-react';

export default function OperatorDashboard() {
    return (
        <div className="h-screen bg-slate-50">
            <ComingSoon
                title="Medical Staff Dashboard"
                description="The operator control center is currently under development. Soon you will be able to manage medical records and view comprehensive analytics here."
                icon={LayoutDashboard}
                color="brand"
            />
        </div>
    );
}
