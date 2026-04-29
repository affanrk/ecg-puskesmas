import axiosInstance from '../http/axiosInstance';

export async function fetchPatientDashboard() {
    try {
        const response = await axiosInstance.get('/patient/dashboard');
        return response.data ?? null;
    } catch (error) {
        console.error("Fetch Patient Dashboard Error:", error);
        return null;
    }
}

