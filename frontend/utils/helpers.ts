import axios, { AxiosError } from 'axios';
import { ProfileData, User, ApprovalLog } from '@/types/user';
import { ApiErrorResponse, ApiValidationError, ParsedApiError } from '@/types/api';

export function escapeHtml(text: string | null | undefined): string {
    if (text === null || text === undefined) return "-";
    const map: { [key: string]: string } = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, (m) => map[m]);
}

export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatDate(isoString: string | null | undefined): string {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
}

export function formatDateShort(isoString: string | null | undefined): string {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

export function debounce<Args extends string | number | boolean | object | null | undefined>(
    func: (...args: Args[]) => void, 
    wait: number
) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: Args[]) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export function calculateAge(birthDateString: string | null | undefined): number | "" {
    if (!birthDateString) return "";
    const today = new Date();
    const birthDate = new Date(birthDateString);
    if (isNaN(birthDate.getTime())) return "";
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    if (age < 0) return 0;
    if (age > 150) return "";
    return age;
}

export function getApiUrl(): string {
    const env = (typeof window !== 'undefined' ? window.__ENV__ : null) || {};
    let url = env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

    console.log('[getApiUrl] Runtime Env:', env.NEXT_PUBLIC_API_URL);
    console.log('[getApiUrl] Build-time Env:', process.env.NEXT_PUBLIC_API_URL);

    url = url.replace(/\/$/, '');

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https://' : 'http://';
        url = `${protocol}${url}`;
    }

    if (!url.endsWith('/api/v1')) {
        url = `${url}/api/v1`;
    }

    console.log('[getApiUrl] Final URL:', url);
    return url;
}

export function getActiveProfile(user: User | ApprovalLog | null | undefined): ProfileData {
    if (!user) return {};
    return (user.patient_profile || user.operator_profile || user.doctor_profile || {}) as ProfileData;
}

export function parseApiError(err: Error | AxiosError<ApiErrorResponse> | object): ParsedApiError {
    const result: ParsedApiError = {
        message: "An unexpected error occurred",
        fieldErrors: {},
    };

    if (axios.isAxiosError(err)) {
        if (err.response) {
            result.status = err.response.status;
            const data = err.response.data;

            const mainMsg = data.error?.message || (typeof data.detail === 'string' ? data.detail : result.message);
            result.message = mainMsg;

            const extractFromDetails = (details: ApiErrorResponse['detail'] | (NonNullable<ApiErrorResponse['error']>['details'])) => {
                if (!details || typeof details !== 'object') return;

                if ('field' in details && typeof details.field === 'string') {
                    const field = details.field;
                    const msg = String(('message' in details ? details.message : ('error' in details ? details.error : mainMsg)) || mainMsg);
                    result.fieldErrors[field] = msg;
                    return;
                }

                if (Array.isArray(details)) {
                    (details as ApiValidationError[]).forEach((e) => {
                        if (e.loc && Array.isArray(e.loc)) {
                            const field = String(e.loc[e.loc.length - 1]);
                            result.fieldErrors[field] = e.msg;
                        }
                    });
                    return;
                }

                Object.entries(details as Record<string, string | string[] | number | boolean>).forEach(([key, value]) => {
                    if (typeof value === 'string') {
                        if (value.length > 5 && value.includes(' ')) {
                            result.fieldErrors[key] = value;
                        } else if (result.status === 400 || result.status === 409 || result.status === 422) {
                            result.fieldErrors[key] = mainMsg;
                        } else {
                            result.fieldErrors[key] = value;
                        }
                    } else if (Array.isArray(value)) {
                        result.fieldErrors[key] = String(value[0]);
                    }
                });
            };

            if (data.error?.details) {
                extractFromDetails(data.error.details);
            } else if (data.detail) {
                extractFromDetails(data.detail);
            }
        } else {
            result.message = "Network error. Please check your connection or server status.";
        }
    } else if (err instanceof Error) {
        result.message = err.message;
    }

    return result;
}
