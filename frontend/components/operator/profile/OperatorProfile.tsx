'use client';

import ProfileShell from '@/components/shared/profile/ProfileShell';
import OperatorProfileHeader from './parts/OperatorProfileHeader';

export default function OperatorProfile({ openTab }: { openTab?: string }) {
    return (
        <ProfileShell
            openTab={openTab}
            rejectionLabel="Your operator profile was not approved."
            renderHeader={(props) => <OperatorProfileHeader {...props} />}
        />
    );
}
