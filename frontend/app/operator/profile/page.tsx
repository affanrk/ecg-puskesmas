'use client';

import OperatorProfile from '@/components/operator/profile/OperatorProfile';
import { useSearchParams } from 'next/navigation';

export default function OperatorProfilePage() {
    const searchParams = useSearchParams();
    const tab = searchParams?.get('tab') || '';

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-white">
            <OperatorProfile openTab={tab} />
        </div>
    );
}
