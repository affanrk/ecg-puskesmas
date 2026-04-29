import axiosInstance from '../http/axiosInstance';
import { ProfilePayload } from '@/types/user';

export async function createDoctorProfile(profileData: ProfilePayload) {
    try {
        const response = await axiosInstance.post('/doctor/profile', profileData);
        return response.data;
    } catch (error) {
        console.error("Create Doctor Profile Error:", error);
        throw error;
    }
}

export async function updateDoctorProfile(profileData: ProfilePayload) {
    try {
        const response = await axiosInstance.put('/doctor/profile', profileData);
        return response.data;
    } catch (error) {
        console.error("Update Doctor Profile Error:", error);
        throw error;
    }
}

