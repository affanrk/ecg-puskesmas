'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

interface RuntimeConfigProps {
    apiUrl: string;
    wsUrl: string;
}

export default function RuntimeConfig({ apiUrl, wsUrl }: RuntimeConfigProps) {
    const setRuntimeConfig = useStore((state) => state.setRuntimeConfig);
    const isInitialized = useRef(false);

    useEffect(() => {
        if (!isInitialized.current) {
            setRuntimeConfig(apiUrl, wsUrl);
            isInitialized.current = true;
        }
    }, [apiUrl, wsUrl, setRuntimeConfig]);

    return null;
}
