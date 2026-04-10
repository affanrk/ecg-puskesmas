'use client';

import PatientProfile from '@/components/patient/profile/PatientProfile';
import { useSearchParams } from 'next/navigation';

export default function ProfilePage() {
    const searchParams = useSearchParams();
    const tab = searchParams?.get('tab') || '';

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-white">
            <PatientProfile openTab={tab} />
        </div>
    );
}
