import axiosInstance from './axiosInstance';
import { getApiUrl } from '../utils/helpers';
import { UserFormPayload, AuthPayload, ProfilePayload, AdminUserPayload } from '@/types/user';
import { HistoryFilters } from '@/types/models';

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

export async function updateUserStatus(userId: string, action: 'APPROVE' | 'REJECT', reason?: string) {
    try {
        const response = await axiosInstance.post(`/admin/update-status/${userId}`, {
            action: action,
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

export async function createPatientProfile(profileData: ProfilePayload) {
    try {
        const response = await axiosInstance.post('/auth/profile/patient', profileData);
        return response.data;
    } catch (error) {
        console.error("Create Profile Error:", error);
        throw error;
    }
}

export async function updatePatientProfile(profileData: ProfilePayload) {
    try {
        const response = await axiosInstance.put('/auth/profile/patient', profileData);
        return response.data;
    } catch (error) {
        console.error("Update Patient Profile Error:", error);
        throw error;
    }
}

export async function updateOperatorProfile(profileData: ProfilePayload) {
    try {
        const response = await axiosInstance.put('/auth/profile/operator', profileData);
        return response.data;
    } catch (error) {
        console.error("Update Operator Profile Error:", error);
        throw error;
    }
}

export async function updateDoctorProfile(profileData: ProfilePayload) {
    try {
        const response = await axiosInstance.put('/auth/profile/doctor', profileData);
        return response.data;
    } catch (error) {
        console.error("Update Doctor Profile Error:", error);
        throw error;
    }
}

export async function createOperatorProfile(profileData: ProfilePayload) {
    try {
        const response = await axiosInstance.post('/auth/profile/operator', profileData);
        return response.data;
    } catch (error) {
        console.error("Create Operator Profile Error:", error);
        throw error;
    }
}

export async function createDoctorProfile(profileData: ProfilePayload) {
    try {
        const response = await axiosInstance.post('/auth/profile/doctor', profileData);
        return response.data;
    } catch (error) {
        console.error("Create Doctor Profile Error:", error);
        throw error;
    }
}

export async function register(data: AuthPayload) {
    try {
        const response = await axiosInstance.post('/auth/register', data);
        return response.data;
    } catch (error) {
        console.error("Register Error:", error);
        throw error;
    }
}

export async function login(data: AuthPayload) {
    try {
        const response = await axiosInstance.post('/auth/login', data);
        return response.data;
    } catch (error) {
        console.error("Login Error:", error);
        throw error;
    }
}

export async function fetchUsers(filters: HistoryFilters = {}) {
    try {
        const response = await axiosInstance.get('/admin/users', { params: filters });
        return response.data;
    } catch (error) {
        console.error("Fetch Users Error:", error);
        throw error;
    }
}

function formatUserPayload(data: UserFormPayload) {
    const {
        full_name, nik, pob, dob, gender, address, contact_number,
        medical_history, str_number, sip_number, operator_role, specialty, work_location,
        ...rest
    } = data;

    const payload: AdminUserPayload = { ...rest };
    const baseProfile = { full_name, nik, pob, dob, gender, address, contact_number };

    Object.keys(baseProfile).forEach(key => {
        if (baseProfile[key as keyof typeof baseProfile] === '') {
            delete baseProfile[key as keyof typeof baseProfile];
        }
    });

    if (data.role === 'patient') {
        payload.patient_profile = { ...baseProfile, medical_history: medical_history || undefined };
    } else if (data.role === 'operator') {
        payload.operator_profile = { ...baseProfile, str_number: str_number || undefined, operator_role: operator_role || undefined, work_location: work_location || undefined };
    } else if (data.role === 'doctor') {
        payload.doctor_profile = { ...baseProfile, str_number: str_number || undefined, sip_number: sip_number || undefined, specialty: specialty || undefined, work_location: work_location || undefined };
    }

    return payload;
}

export async function createUser(data: UserFormPayload) {
    try {
        const payload = formatUserPayload(data);
        const response = await axiosInstance.post('/admin/users', payload);
        return response.data;
    } catch (error) {
        console.error("Create User Error:", error);
        throw error;
    }
}

export async function updateUser(userId: string, data: UserFormPayload) {
    try {
        const payload = formatUserPayload(data);
        const response = await axiosInstance.put(`/admin/users/${userId}`, payload);
        return response.data;
    } catch (error) {
        console.error("Update User Error:", error);
        throw error;
    }
}

export async function deleteUser(userId: string) {
    try {
        await axiosInstance.delete(`/admin/users/${userId}`);
    } catch (error) {
        console.error("Delete User Error:", error);
        throw error;
    }
}

export const api = {
    login,
    register,
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
    createOperatorProfile,
    createDoctorProfile,
    updatePatientProfile,
    updateOperatorProfile,
    updateDoctorProfile,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser
};
