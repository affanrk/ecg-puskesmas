'use client';

import { useSearchParams } from 'next/navigation';

import DoctorProfile from '@/components/doctor/profile/DoctorProfile';

export default function DoctorProfilePage() {
    const searchParams = useSearchParams();
    const tab = searchParams?.get('tab') || '';

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-white">
            <DoctorProfile openTab={tab} />
        </div>
    );
}
