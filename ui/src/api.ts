import axios from 'axios';

// Use environment variable if set, otherwise default to local backend
const BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8001`;
const API_URL = `${BASE_URL}/api`;

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
        const response = await axios.get(`${API_URL}/keywords`);
        return response.data.keywords || [];
    },
    updateKeywords: async (keywords: KeywordConfig[]): Promise<void> => {
        await axios.post(`${API_URL}/keywords`, keywords);
    },
    startScraping: async (keywords?: KeywordConfig[]): Promise<void> => {
        if (keywords) {
            await axios.post(`${API_URL}/start`, keywords);
        } else {
            await axios.post(`${API_URL}/start`);
        }
    },
    stopScraping: async (): Promise<void> => {
        await axios.post(`${API_URL}/stop`);
    },
    getStatus: async (): Promise<ScrapeStatus> => {
        const response = await axios.get(`${API_URL}/status`);
        return response.data;
    },
    getResults: async (): Promise<Lead[]> => {
        const response = await axios.get(`${API_URL}/results`);
        return response.data;
    },
    retryKeyword: async (keyword: string): Promise<void> => {
        await axios.post(`${API_URL}/retry/${encodeURIComponent(keyword)}`);
    }
};
