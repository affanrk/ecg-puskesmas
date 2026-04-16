'use client';

import ProfileShell from '@/components/shared/profile/ProfileShell';
import ProfileHeader from './parts/ProfileHeader';

export default function PatientProfile({ openTab }: { openTab?: string }) {
    return (
        <ProfileShell
            openTab={openTab}
            rejectionLabel="Your medical profile was not approved."
            renderHeader={(props) => <ProfileHeader {...props} />}
        />
    );
}
