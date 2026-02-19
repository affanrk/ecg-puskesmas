'use client';

import { UserCircle } from 'lucide-react';
import ComingSoon from '@/components/shared/ComingSoon';

export default function AdminProfile() {
    return (
        <div className="h-full bg-white flex flex-col items-center justify-center">
            <ComingSoon 
                title="Admin Profile" 
                description="Administrative profile settings and credential management are being refined for high-security environments. Individual admin profile customization will be available in the next release."
                icon={UserCircle}
                color="rose"
            />
        </div>
    );
}
