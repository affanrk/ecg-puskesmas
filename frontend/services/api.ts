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

const getEnv = (key: string): string | undefined => {
    if (typeof window !== 'undefined' && window.__ENV__) {
        return window.__ENV__[key];
    }
    return undefined;
};

const getApiBaseUrl = (): string => {
    const envVar = getEnv('NEXT_PUBLIC_API_URL');
    const processVar = process.env.NEXT_PUBLIC_API_URL;
    const defaultVar = 'http://localhost:8080/api/v1';

    return envVar || processVar || defaultVar;
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
        const response = await axios.get(`${getApiBaseUrl()}/history`, { params });
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
    const url = `${getApiBaseUrl()}/export/${endpoint}/${recordingId}`;
    window.open(url, '_blank');
}

export async function fetchUserProfile(token: string) {
    try {
        const response = await axios.get(`${getApiBaseUrl()}/auth/me`, {
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
        const response = await axios.get(`${getApiBaseUrl()}/history/stats`, { params });
        return response.data;
    } catch (error) {
        console.error("Fetch Stats Error:", error);
        return {};
    }
}

export async function fetchRecentHistory(userId: number, limit: number = 10) {
    try {
        const params = { user_id: userId, limit };
        const response = await axios.get(`${getApiBaseUrl()}/history/recent`, { params });
        return response.data;
    } catch (error) {
        console.error("Fetch Recent History Error:", error);
        return [];
    }
}

// --- Exports ---

export const api = {
    fetchHistory,
    downloadRecording,
    fetchUserProfile,
    fetchStats,
    fetchRecentHistory
};
