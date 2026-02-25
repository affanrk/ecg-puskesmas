import axios from 'axios';

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

export function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number) {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: Parameters<T>) {
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
    const env = (typeof window !== 'undefined' ? (window as { __ENV__?: Record<string, string> }).__ENV__ : null) || {};
    let url = env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

    url = url.replace(/\/$/, '');

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https://' : 'http://';
        url = `${protocol}${url}`;
    }

    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://') && !url.includes('localhost')) {
        url = url.replace('http://', 'https://');
    }

    if (!url.endsWith('/api/v1')) {
        url = `${url}/api/v1`;
    }

    return url;
}

export interface ParsedApiError {
    message: string;
    fieldErrors: Record<string, string>;
    status?: number;
}

export function parseApiError(err: unknown): ParsedApiError {
    const result: ParsedApiError = {
        message: "An unexpected error occurred",
        fieldErrors: {},
    };

    if (axios.isAxiosError(err)) {
        if (err.response) {
            result.status = err.response.status;
            const data = err.response.data as {
                error?: {
                    message: string;
                    details?: Array<{ loc: string[]; msg: string }>;
                };
                detail?: string | Array<{ loc: string[]; msg: string }>;
            };

            if (data.error) {
                result.message = data.error.message || result.message;
                if (data.error.details && Array.isArray(data.error.details)) {
                    data.error.details.forEach((e: { loc: string[]; msg: string }) => {
                        const field = e.loc[e.loc.length - 1];
                        result.fieldErrors[field] = e.msg;
                    });
                }
            }
            else if (data.detail) {
                if (typeof data.detail === 'string') {
                    result.message = data.detail;
                } else if (Array.isArray(data.detail)) {
                    result.message = "Validation failed";
                    data.detail.forEach((e: { loc: string[]; msg: string }) => {
                        const field = e.loc[e.loc.length - 1];
                        result.fieldErrors[field] = e.msg;
                    });
                }
            }
        } else {
            result.message = "Network error. Please check your connection or server status.";
        }
    } else if (err instanceof Error) {
        result.message = err.message;
    }

    return result;
}
