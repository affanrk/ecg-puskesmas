import axios from 'axios';
import { getApiUrl } from '../utils/helpers';
import { useStore } from '@/store/useStore';

const axiosInstance = axios.create({
    baseURL: getApiUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('ecg_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('ecg_token');
            localStorage.removeItem('ecg_user');
            
            useStore.getState().setUser(null);
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
