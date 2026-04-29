import axiosInstance from '../http/axiosInstance';
import { ProfilePayload } from '@/types/user';

export async function fetchOperatorDashboard() {
    try {
        const response = await axiosInstance.get('/operator/dashboard');
        return response.data ?? null;
    } catch (error) {
        console.error("Fetch Operator Dashboard Error:", error);
        return null;
    }
}

export async function createOperatorProfile(profileData: ProfilePayload) {
    try {
        const response = await axiosInstance.post('/operator/profile', profileData);
        return response.data;
    } catch (error) {
        console.error("Create Operator Profile Error:", error);
        throw error;
    }
}

export async function updateOperatorProfile(profileData: ProfilePayload) {
    try {
        const response = await axiosInstance.put('/operator/profile', profileData);
        return response.data;
    } catch (error) {
        console.error("Update Operator Profile Error:", error);
        throw error;
    }
}

