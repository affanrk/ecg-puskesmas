import axiosInstance from '../http/axiosInstance';
import { UserFormPayload, AdminUserPayload } from '@/types/user';
import { HistoryFilters } from '@/types/models';


export async function fetchUsers(filters: HistoryFilters = {}) {
    try {
        const response = await axiosInstance.get('/admin/users', { params: filters });
        return response.data;
    } catch (error) {
        console.error("Fetch Users Error:", error);
        throw error;
    }
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
        const response = await axiosInstance.put(`/admin/users/${userId}`, payload, {
            params: { target_user_id: userId }
        });
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

function formatUserPayload(data: UserFormPayload) {
    const {
        full_name, nik, pob, dob, gender, address, contact_number,
        medical_history, str_number, str_expiry_date, sip_number, sip_expiry_date, operator_role, specialty,
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
        payload.operator_profile = { 
            ...baseProfile, 
            str_number: str_number || undefined, 
            str_expiry_date: str_expiry_date || undefined,
            operator_role: operator_role || undefined 
        };
    } else if (data.role === 'doctor') {
        payload.doctor_profile = { 
            ...baseProfile, 
            str_number: str_number || undefined, 
            str_expiry_date: str_expiry_date || undefined,
            sip_number: sip_number || undefined, 
            sip_expiry_date: sip_expiry_date || undefined,
            specialty: specialty || undefined 
        };
    }

    return payload;
}

