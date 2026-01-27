import axios from 'axios';

// --- Types ---

declare global {
    interface Window {
        __ENV__?: Record<string, string>;
    }
}

export interface HistoryFilters {
    [key: string]: string | number | boolean | undefined;
}

// --- Environment Helpers ---

export const getApiUrl = (): string => {
    let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

    if (typeof window !== 'undefined' && window.__ENV__) {
        url = window.__ENV__.NEXT_PUBLIC_API_URL || url;
    }

    // Sanitize: Remove trailing slash
    url = url.replace(/\/$/, '');

    // Auto-fix: Ensure it ends with /api/v1
    if (!url.endsWith('/api/v1')) {
        url = `${url}/api/v1`;
    }

    return url;
};

// --- API Functions ---

export async function fetchHistory(filters: HistoryFilters = {}) {
    const params = new URLSearchParams();
    for (const key in filters) {
        const val = filters[key];
        if (val !== undefined && val !== null && val !== '') {
            params.append(key, String(val));
        }
    }
    params.append('t', Date.now().toString());

    try {
        const response = await axios.get(`${getApiUrl()}/history`, { params });
        return response.data;
    } catch (error) {
        console.error("Fetch History Error:", error);
        throw error;
    }
}

export function downloadRecording(type: 'raw' | 'feature' | 'plot', recordingId: string) {
    if (!recordingId) return;

    const endpointMap: { [key: string]: string } = {
        'raw': 'raw',
        'feature': 'features',
        'plot': 'plot'
    };

    const endpoint = endpointMap[type] || type;
    const url = `${getApiUrl()}/export/${endpoint}/${recordingId}`;
    window.open(url, '_blank');
}

export async function fetchUserProfile(token: string) {
    try {
        const response = await axios.get(`${getApiUrl()}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error("Fetch User Profile Error:", error);
        throw error;
    }
}

export async function fetchStats(userId?: number) {
    try {
        const params = userId ? { user_id: userId } : {};
        const response = await axios.get(`${getApiUrl()}/history/stats`, { params });
        return response.data;
    } catch (error) {
        console.error("Fetch Stats Error:", error);
        return {};
    }
}

export async function fetchRecentHistory(userId: number, limit: number = 10) {
    try {
        const params = { user_id: userId, limit };
        const response = await axios.get(`${getApiUrl()}/history/recent`, { params });
        return response.data;
    } catch (error) {
        console.error("Fetch Recent History Error:", error);
        return [];
    }
}

export async function fetchCalendar(filters: {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    user_id?: number;
}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
            params.append(key, String(val));
        }
    });

    try {
        const response = await axios.get(`${getApiUrl()}/history/calendar`, { params });
        return response.data;
    } catch (error) {
        console.error("Fetch Calendar Error:", error);
        throw error;
    }
}

// --- Exports ---

export const api = {
    fetchHistory,
    downloadRecording,
    fetchUserProfile,
    fetchStats,
    fetchRecentHistory,
    fetchCalendar
};
