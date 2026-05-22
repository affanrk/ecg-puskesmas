import { useState, useEffect, useCallback, useRef } from 'react';

import { api } from '@/services';
import { CheckDuplicateResponse } from '@/types/models';

interface UseDuplicateCheckOptions {
    nik?: string;
    email?: string;
    debounceMs?: number;
}

export function useDuplicateCheck({ nik, email, debounceMs = 500 }: UseDuplicateCheckOptions) {
    const [checking, setChecking] = useState(false);
    const [result, setResult] = useState<CheckDuplicateResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const checkDuplicate = useCallback(async (checkNik?: string, checkEmail?: string) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        if (!checkNik && !checkEmail) {
            setResult(null);
            setError(null);
            return;
        }

        setChecking(true);
        setError(null);

        abortControllerRef.current = new AbortController();

        try {
            const response = await api.checkStaffDuplicate({
                nik: checkNik,
                email: checkEmail
            });
            setResult(response?.data || null);
        } catch (err: unknown) {
            if ((err as Error).name !== 'AbortError') {
                setError('Failed to check for duplicates');
                setResult(null);
            }
        } finally {
            setChecking(false);
        }
    }, []);

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        if (!nik && !email) {
            setResult(null);
            setError(null);
            return;
        }

        timeoutRef.current = setTimeout(() => {
            checkDuplicate(nik, email);
        }, debounceMs);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [nik, email, debounceMs, checkDuplicate]);

    return {
        checking,
        result,
        error,
        hasNikDuplicate: result?.nik_exists || false,
        hasEmailDuplicate: result?.email_exists || false,
        existingStaff: result?.existing_staff || null
    };
}
