'use client';

import { useSearchParams } from 'next/navigation';

import PatientProfile from '@/components/patient/profile/PatientProfile';

export default function ProfilePage() {
    const searchParams = useSearchParams();
    const tab = searchParams?.get('tab') || '';

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-white">
            <PatientProfile openTab={tab} />
        </div>
    );
}
