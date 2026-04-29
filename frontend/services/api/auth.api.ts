import axiosInstance from '../http/axiosInstance';
import { AuthPayload } from '@/types/user';

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

export async function login(data: AuthPayload) {
    try {
        const response = await axiosInstance.post('/auth/login', data);
        return response.data;
    } catch (error) {
        console.error("Login Error:", error);
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

export async function register(data: AuthPayload) {
    try {
        const response = await axiosInstance.post('/auth/register', data);
        return response.data;
    } catch (error) {
        console.error("Register Error:", error);
        throw error;
    }
}

