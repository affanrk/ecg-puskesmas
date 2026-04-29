import axiosInstance from '../http/axiosInstance';
import { getApiUrl } from '../../utils/helpers';
import { HistoryFilters } from '@/types/models';

export async function fetchCalendar(filters: {
    year?: number;
    month?: number;
    day?: number;
    hour?: number;
    minute?: number;
    user_id?: string;
}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
            params.append(key, String(val));
        }
    });
    try {
        const response = await axiosInstance.get('/history/calendar', { params });
        return response.data;
    } catch (error) {
        console.error("Fetch Calendar Error:", error);
        throw error;
    }
}

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
        const response = await axiosInstance.get('/history', { params });
        return response.data;
    } catch (error) {
        console.error("Fetch History Error:", error);
        throw error;
    }
}

export async function fetchRecentHistory(userId: string, limit: number = 10) {
    try {
        const params = { user_id: userId, limit };
        const response = await axiosInstance.get('/history/recent', { params });
        return response.data;
    } catch (error) {
        console.error("Fetch Recent History Error:", error);
        return [];
    }
}

export async function fetchStats(userId?: string) {
    try {
        const params = userId ? { user_id: userId } : {};
        const response = await axiosInstance.get('/history/stats', { params });
        return response.data;
    } catch (error) {
        console.error("Fetch Stats Error:", error);
        return {};
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

