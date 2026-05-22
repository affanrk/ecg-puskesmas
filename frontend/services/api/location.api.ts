import axiosInstance from '../http/axiosInstance';
import { LocationCreatePayload, LocationUpdatePayload } from '@/types/user';
import { HistoryFilters } from '@/types/models';


export async function fetchPublicLocations() {
    try {
        const response = await axiosInstance.get('/public/locations');
        return response.data;
    } catch (error) {
        console.error("Fetch Public Locations Error:", error);
        throw error;
    }
}

export async function fetchLocations(filters: HistoryFilters = {}) {
    try {
        const response = await axiosInstance.get('/admin/locations', { params: filters });
        return response.data;
    } catch (error) {
        console.error("Fetch Locations Error:", error);
        throw error;
    }
}

export async function fetchStaffLocations(staffId: string) {
    try {
        const response = await axiosInstance.get(`/admin/staff/${staffId}/locations`);
        return response.data;
    } catch (error) {
        console.error("Fetch Staff Locations Error:", error);
        throw error;
    }
}

export async function createLocation(data: LocationCreatePayload) {
    try {
        const response = await axiosInstance.post('/superadmin/locations', data);
        return response.data;
    } catch (error) {
        console.error("Create Location Error:", error);
        throw error;
    }
}

export async function updateLocation(locationId: string, data: LocationUpdatePayload) {
    try {
        const response = await axiosInstance.put(`/superadmin/locations/${locationId}`, data);
        return response.data;
    } catch (error) {
        console.error("Update Location Error:", error);
        throw error;
    }
}

export async function deleteLocation(locationId: string) {
    try {
        await axiosInstance.delete(`/superadmin/locations/${locationId}`);
    } catch (error) {
        console.error("Delete Location Error:", error);
        throw error;
    }
}

export async function removeStaffLocation(staffId: string, locationId: string) {
    try {
        await axiosInstance.delete(`/admin/staff/${staffId}/locations/${locationId}`);
    } catch (error) {
        console.error("Remove Staff Location Error:", error);
        throw error;
    }
}

export async function activateLocation(locationId: string) {
    try {
        const response = await axiosInstance.patch(`/superadmin/locations/${locationId}/activate`);
        return response.data;
    } catch (error) {
        console.error("Activate Location Error:", error);
        throw error;
    }
}

export async function assignStaffLocation(staffId: string, data: { location_id: string; is_primary: boolean }) {
    try {
        const response = await axiosInstance.post(`/admin/staff/${staffId}/locations`, data);
        return response.data;
    } catch (error) {
        console.error("Assign Staff Location Error:", error);
        throw error;
    }
}

export async function deactivateLocation(locationId: string) {
    try {
        const response = await axiosInstance.patch(`/superadmin/locations/${locationId}/deactivate`);
        return response.data;
    } catch (error) {
        console.error("Deactivate Location Error:", error);
        throw error;
    }
}

export async function setStaffPrimaryLocation(staffId: string, locationId: string) {
    try {
        const response = await axiosInstance.patch(`/admin/staff/${staffId}/locations/${locationId}/set-primary`);
        return response.data;
    } catch (error) {
        console.error("Set Staff Primary Location Error:", error);
        throw error;
    }
}

