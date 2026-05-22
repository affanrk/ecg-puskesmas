'use client';

import DoctorProfileHeader from './parts/DoctorProfileHeader';
import ProfileShell from '@/components/shared/profile/ProfileShell';

export default function DoctorProfile({ openTab }: { openTab?: string }) {
    return (
        <ProfileShell
            openTab={openTab}
            rejectionLabel="Your doctor profile was not approved."
            renderHeader={(props) => <DoctorProfileHeader {...props} />}
        />
    );
}
