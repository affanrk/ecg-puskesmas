import axiosInstance from '../http/axiosInstance';
import { HistoryFilters } from '@/types/models';


export async function fetchAdminDashboard() {
    try {
        const response = await axiosInstance.get('/admin/dashboard');
        return response.data ?? null;
    } catch (error) {
        console.error("Fetch Admin Dashboard Error:", error);
        return null;
    }
}

export async function fetchAdmins(filters: HistoryFilters = {}) {
    try {
        const response = await axiosInstance.get('/superadmin/admins', { params: filters });
        return response.data;
    } catch (error) {
        console.error("Fetch Admins Error:", error);
        throw error;
    }
}

export async function fetchApprovalLogs(filters: HistoryFilters = {}) {
    try {
        const response = await axiosInstance.get('/admin/approvals/users/history', { params: filters });
        return response.data;
    } catch (error) {
        console.error("Fetch Approval Logs Error:", error);
        throw error;
    }
}

export async function fetchPendingApprovals(filters: HistoryFilters = {}) {
    try {
        const response = await axiosInstance.get('/admin/approvals/users/pending', { params: filters });
        return response.data;
    } catch (error) {
        console.error("Fetch Pending Approvals Error:", error);
        throw error;
    }
}

export async function createSuperAdminUser(data: Record<string, unknown>) {
    try {
        const response = await axiosInstance.post('/superadmin/admins', data);
        return response.data;
    } catch (error) {
        console.error("Create Admin Error:", error);
        throw error;
    }
}

export async function updateUserStatus(userId: string, action: 'APPROVE' | 'REJECT', reason?: string) {
    try {
        const response = await axiosInstance.put(`/admin/users/${userId}/account-status`, {
            action: action,
            reason: reason
        });
        return response.data;
    } catch (error) {
        console.error("Update User Status Error:", error);
        throw error;
    }
}

export async function deleteAdmin(adminId: string) {
    try {
        await axiosInstance.delete(`/superadmin/admins/${adminId}`);
    } catch (error) {
        console.error("Delete Admin Error:", error);
        throw error;
    }
}

export async function activateAdmin(adminId: string) {
    try {
        const response = await axiosInstance.patch(`/superadmin/admins/${adminId}/activate`);
        return response.data;
    } catch (error) {
        console.error("Activate Admin Error:", error);
        throw error;
    }
}

export async function deactivateAdmin(adminId: string) {
    try {
        const response = await axiosInstance.patch(`/superadmin/admins/${adminId}/deactivate`);
        return response.data;
    } catch (error) {
        console.error("Deactivate Admin Error:", error);
        throw error;
    }
}

export async function reassignAdminLocation(userId: string, locationId: string) {
    try {
        const response = await axiosInstance.put(`/superadmin/admins/${userId}/location`, null, {
            params: { location_id: locationId }
        });
        return response.data;
    } catch (error) {
        console.error("Reassign Admin Error:", error);
        throw error;
    }
}

export async function fetchPendingAdditionalLocationRequests(params?: { skip?: number; limit?: number }) {
    try {
        const response = await axiosInstance.get('/admin/approvals/location-requests/pending', { params });
        return response.data;
    } catch (error) {
        console.error("Fetch Pending Additional Location Requests Error:", error);
        throw error;
    }
}

export async function approveAdditionalLocationRequest(requestId: string) {
    try {
        const response = await axiosInstance.post(`/admin/approvals/location-requests/${requestId}/approve`);
        return response.data;
    } catch (error) {
        console.error("Approve Additional Location Request Error:", error);
        throw error;
    }
}

export async function rejectAdditionalLocationRequest(requestId: string, rejectionReason: string) {
    try {
        const response = await axiosInstance.post(`/admin/approvals/location-requests/${requestId}/reject`, {
            rejection_reason: rejectionReason
        });
        return response.data;
    } catch (error) {
        console.error("Reject Additional Location Request Error:", error);
        throw error;
    }
}

export async function resignStaff(staffId: string, resignationDate: string, reason?: string) {
    try {
        const response = await axiosInstance.post(`/admin/staff/${staffId}/resignation`, {
            resignation_date: resignationDate,
            reason: reason
        });
        return response.data;
    } catch (error) {
        console.error("Resign Staff Error:", error);
        throw error;
    }
}

export async function checkStaffDuplicate(params: { nik?: string; email?: string }) {
    try {
        const response = await axiosInstance.get('/admin/staff/validate-credentials', { params });
        return response.data;
    } catch (error) {
        console.error("Check Staff Duplicate Error:", error);
        throw error;
    }
}

export async function getExpiringCredentials(params: { days: string; credential_type?: string }) {
    try {
        const response = await axiosInstance.get('/admin/staff/credentials/expiring', { params });
        return response.data;
    } catch (error) {
        console.error("Get Expiring Credentials Error:", error);
        throw error;
    }
}

export async function sendCredentialNotifications(data: { user_ids: string[]; credential_type: string }) {
    try {
        const response = await axiosInstance.post('/admin/staff/credentials/notifications', data);
        return response.data;
    } catch (error) {
        console.error("Send Credential Notifications Error:", error);
        throw error;
    }
}

