import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export interface HistoryFilters {
    [key: string]: any;
}

export async function fetchHistory(filters: HistoryFilters = {}) {
    const params = new URLSearchParams();
    for (const key in filters) {
        if (filters[key]) params.append(key, filters[key]);
    }
    params.append('t', Date.now().toString());

    try {
        const response = await axios.get(`${API_BASE_URL}/history`, { params });
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
    const url = `${API_BASE_URL}/export/${endpoint}/${recordingId}`;
    window.open(url, '_blank');
}

export const api = {
    fetchHistory,
    downloadRecording
};
