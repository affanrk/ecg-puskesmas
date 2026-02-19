import axiosInstance from './axiosInstance';
import { getApiUrl } from '../utils/helpers';

export interface HistoryFilters {
    [key: string]: string | number | boolean | undefined;
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
        const response = await axiosInstance.get('/auth/me', {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        return response.data;
    } catch (error) {
        console.error("Fetch User Profile Error:", error);
        throw error;
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

export async function fetchPendingApprovals(filters: HistoryFilters = {}) {
    try {
        const response = await axiosInstance.get('/admin/pending-approvals', { params: filters });
        return response.data;
    } catch (error) {
        console.error("Fetch Pending Approvals Error:", error);
        throw error;
    }
}

export async function updateUserStatus(userId: string, isActivated: number, reason?: string) {
    try {
        const response = await axiosInstance.post(`/admin/update-status/${userId}`, {
            is_activated: isActivated,
            reason: reason
        });
        return response.data;
    } catch (error) {
        console.error("Update User Status Error:", error);
        throw error;
    }
}

export async function fetchApprovalLogs(filters: HistoryFilters = {}) {
    try {
        const response = await axiosInstance.get('/admin/approval-logs', { params: filters });
        return response.data;
    } catch (error) {
        console.error("Fetch Approval Logs Error:", error);
        throw error;
    }
}

export async function logout() {
    try {
        const response = await axiosInstance.post('/auth/logout');
        return response.data;
    } catch (error) {
        console.error("Logout Error:", error);
        throw error;
    }
}

export async function fetchDetailedHealth() {
    try {
        const response = await axiosInstance.get('/health/detailed');
        return response.data;
    } catch (error) {
        console.error("Fetch Health Error:", error);
        throw error;
    }
}

export async function createPatientProfile(profileData: Record<string, unknown>) {
    try {
        const response = await axiosInstance.post('/auth/profile/patient', profileData);
        return response.data;
    } catch (error) {
        console.error("Create Profile Error:", error);
        throw error;
    }
}

export async function updatePatientProfile(profileData: Record<string, unknown>) {
    try {
        const response = await axiosInstance.put('/auth/profile', profileData);
        return response.data;
    } catch (error) {
        console.error("Update Profile Error:", error);
        throw error;
    }
}

export const api = {
    fetchHistory,
    downloadRecording,
    fetchUserProfile,
    fetchStats,
    fetchRecentHistory,
    fetchCalendar,
    fetchPendingApprovals,
    updateUserStatus,
    fetchApprovalLogs,
    logout,
    fetchDetailedHealth,
    createPatientProfile,
    updatePatientProfile
};
