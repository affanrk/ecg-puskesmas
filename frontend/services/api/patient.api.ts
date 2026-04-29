import axiosInstance from '../http/axiosInstance';
import { ProfilePayload, WalkinPatientPayload, ConvertWalkinPayload } from '@/types/user';
import { HistoryFilters } from '@/types/models';


export async function fetchAdminPatients(filters: HistoryFilters = {}) {
    try {
        const response = await axiosInstance.get('/admin/walkin-patients', { params: filters });
        return response.data;
    } catch (error) {
        console.error("Fetch Admin Patients Error:", error);
        throw error;
    }
}

export async function fetchOperatorPatients(filters: HistoryFilters = {}) {
    try {
        const response = await axiosInstance.get('/operator/patients', { params: filters });
        return response.data;
    } catch (error) {
        console.error("Fetch Operator Patients Error:", error);
        throw error;
    }
}

export async function fetchPatientDoctors(patientId: string) {
    try {
        const response = await axiosInstance.get(`/admin/patients/${patientId}/doctors`);
        return response.data;
    } catch (error) {
        console.error("Fetch Patient Doctors Error:", error);
        throw error;
    }
}

export async function createOperatorPatient(data: WalkinPatientPayload) {
    try {
        const response = await axiosInstance.post('/operator/patients', data);
        return response.data;
    } catch (error) {
        console.error("Create Operator Patient Error:", error);
        throw error;
    }
}

export async function createPatientProfile(profileData: ProfilePayload) {
    try {
        const response = await axiosInstance.post('/patient/profile', profileData);
        return response.data;
    } catch (error) {
        console.error("Create Profile Error:", error);
        throw error;
    }
}

export async function updateAdminWalkinPatient(patientId: string, data: WalkinPatientPayload) {
    try {
        const response = await axiosInstance.put(`/admin/walkin-patients/${patientId}`, data);
        return response.data;
    } catch (error) {
        console.error("Update Walk-in Patient Error:", error);
        throw error;
    }
}

export async function updatePatientProfile(profileData: ProfilePayload) {
    try {
        const response = await axiosInstance.put('/patient/profile', profileData);
        return response.data;
    } catch (error) {
        console.error("Update Patient Profile Error:", error);
        throw error;
    }
}

export async function deleteAdminWalkinPatient(patientId: string) {
    try {
        await axiosInstance.delete(`/admin/walkin-patients/${patientId}`);
    } catch (error) {
        console.error("Delete Walk-in Patient Error:", error);
        throw error;
    }
}

export async function removePatientDoctor(patientId: string, doctorId: string) {
    try {
        await axiosInstance.delete(`/admin/patients/${patientId}/doctors/${doctorId}`);
    } catch (error) {
        console.error("Remove Patient Doctor Error:", error);
        throw error;
    }
}

export async function assignPatientDoctor(patientId: string, data: { doctor_id: string; location_id: string }) {
    try {
        const response = await axiosInstance.post(`/admin/patients/${patientId}/doctors`, data);
        return response.data;
    } catch (error) {
        console.error("Assign Patient Doctor Error:", error);
        throw error;
    }
}

export async function convertAdminWalkinPatient(patientId: string, data: ConvertWalkinPayload) {
    try {
        const response = await axiosInstance.post(`/admin/walkin-patients/${patientId}/register`, data);
        return response.data;
    } catch (error) {
        console.error("Convert Walk-in Patient Error:", error);
        throw error;
    }
}

