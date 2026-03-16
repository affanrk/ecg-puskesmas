'use client';

import PatientProfile from '@/components/patient/profile/PatientProfile';

export default function ProfilePage() {
    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-white">
            <PatientProfile />
        </div>
    );
}
