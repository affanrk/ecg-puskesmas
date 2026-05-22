import axiosInstance from '../http/axiosInstance';
import { HistoryFilters } from '@/types/models';


export async function fetchSuperAdminDashboard() {
    try {
        const response = await axiosInstance.get('/superadmin/dashboard');
        return response.data ?? null;
    } catch (error) {
        console.error("Fetch SuperAdmin Dashboard Error:", error);
        return null;
    }
}

export async function fetchSuperAdminLocationDashboard(locationId: string) {
    try {
        const response = await axiosInstance.get(`/superadmin/locations/${locationId}/dashboard`);
        return response.data ?? null;
    } catch (error) {
        console.error("Fetch SuperAdmin Location Dashboard Error:", error);
        return null;
    }
}

export async function fetchSuperAdminUsers(filters: HistoryFilters = {}) {
    try {
        const response = await axiosInstance.get('/superadmin/users', { params: filters });
        return response.data;
    } catch (error) {
        console.error("Fetch SuperAdmin Users Error:", error);
        throw error;
    }
}

export async function fetchSuperAdminLocations(filters: HistoryFilters = {}) {
    try {
        const response = await axiosInstance.get('/superadmin/locations', { params: filters });
        return response.data;
    } catch (error) {
        console.error("Fetch SuperAdmin Locations Error:", error);
        throw error;
    }
}

