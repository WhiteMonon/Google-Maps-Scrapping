import axios from 'axios';

// Helper to ensure URL has protocol
const getBaseUrl = () => {
    let url = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:7860`;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // If no protocol, assume https unless localhost
        const protocol = url.includes('localhost') ? 'http' : 'https';
        url = `${protocol}://${url}`;
    }
    // Remove trailing slash if present
    return url.replace(/\/$/, '');
};

const BASE_URL = getBaseUrl();
const API_URL = `${BASE_URL}/api`;

const axiosInstance = axios.create({
    baseURL: API_URL
});

axiosInstance.interceptors.request.use((config) => {
    const token = import.meta.env.VITE_HF_TOKEN;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export interface Lead {
    name: string;
    address: string;
    website: string;
    phone: string;
    keyword: string;
}

export interface KeywordConfig {
    keyword: string;
    limit: number;
}

export interface KeywordProgress {
    keyword: string;
    status: 'pending' | 'running' | 'done' | 'failed' | 'cancelled';
    current: number;
    limit: number;
    progress: number;
    error?: string;
}

export interface ScrapeStatus {
    is_running: boolean;
    keywords: KeywordProgress[];
    total_leads: number;
}

export const api = {
    getKeywords: async (): Promise<KeywordConfig[]> => {
        const response = await axiosInstance.get('/keywords');
        return response.data.keywords || [];
    },
    updateKeywords: async (keywords: KeywordConfig[]): Promise<void> => {
        await axiosInstance.post('/keywords', keywords);
    },
    startScraping: async (keywords?: KeywordConfig[]): Promise<void> => {
        if (keywords) {
            await axiosInstance.post('/start', keywords);
        } else {
            await axiosInstance.post('/start');
        }
    },
    stopScraping: async (): Promise<void> => {
        await axiosInstance.post('/stop');
    },
    getStatus: async (): Promise<ScrapeStatus> => {
        const response = await axiosInstance.get('/status');
        return response.data;
    },
    getResults: async (): Promise<Lead[]> => {
        const response = await axiosInstance.get('/results');
        return response.data;
    },
    retryKeyword: async (keyword: string): Promise<void> => {
        await axiosInstance.post(`/retry/${encodeURIComponent(keyword)}`);
    }
};
