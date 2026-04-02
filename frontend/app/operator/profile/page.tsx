'use client';

import ComingSoon from '@/components/shared/ComingSoon';
import { Stethoscope } from 'lucide-react';

export default function OperatorProfileComingSoon() {
    return (
        <div className="h-screen bg-slate-50">
            <ComingSoon
                title="Profile & Settings"
                description="Operator profile management is under construction. Soon you will be able to review and update your professional details here."
                icon={Stethoscope}
                color="brand"
            />
        </div>
    );
}
