import axiosInstance from '../http/axiosInstance';

export async function fetchDetailedHealth() {
    try {
        const response = await axiosInstance.get('/health/detailed');
        return response.data;
    } catch (error) {
        console.error("Fetch Health Error:", error);
        throw error;
    }
}

