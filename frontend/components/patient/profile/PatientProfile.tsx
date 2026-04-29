'use client';

import ProfileHeader from './parts/ProfileHeader';
import ProfileShell from '@/components/shared/profile/ProfileShell';

export default function PatientProfile({ openTab }: { openTab?: string }) {
    return (
        <ProfileShell
            openTab={openTab}
            rejectionLabel="Your medical profile was not approved."
            renderHeader={(props) => <ProfileHeader {...props} />}
        />
    );
}
