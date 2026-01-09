import { CONFIG } from '../config.js';

export async function fetchHistory(filters = {}) {
    const params = new URLSearchParams();

    // Mapping filter object ke query string
    for (const key in filters) {
        if (filters[key]) params.append(key, filters[key]);
    }
    params.append('t', Date.now());

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/history?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Fetch History Error:", error);
        throw error;
    }
}

export function downloadRecording(type, recordingId) {
    if (!recordingId) return;
    
    // Map frontend types to backend endpoints
    const endpointMap = {
        'raw': 'raw',
        'feature': 'features',
        'plot': 'plot'
    };
    
    const endpoint = endpointMap[type] || type;
    const url = `${CONFIG.API_BASE_URL}/export/${endpoint}/${recordingId}`;
    window.open(url, '_blank');
}