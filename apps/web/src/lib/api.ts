import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface Monitor {
  id: number;
  name: string;
  type: 'http' | 'tcp' | 'icmp';
  url: string;
  port?: number;
  interval: number;
  timeout: number;
  keyword?: string;
  expectedStatus?: number;
  webhookUrl?: string;
  isPublic: boolean;
  active: boolean;
  status: 'up' | 'down' | 'pending';
  latency?: number;
  uptime: number;
  createdAt: number;
  updatedAt: number;
}

export interface Heartbeat {
  id: number;
  monitorId: number;
  status: 'up' | 'down';
  latency?: number;
  message?: string;
  createdAt: number;
}

export interface PublicStatus {
  overallStatus: 'operational' | 'degraded' | 'down';
  monitors: {
    id: number;
    name: string;
    type: string;
    status: string;
    latency?: number;
    uptime: number;
    lastCheck?: number;
  }[];
}

export const api = {
  getMonitors: async (): Promise<Monitor[]> => {
    const { data } = await axios.get(`${API_URL}/monitors`);
    return data;
  },

  getMonitor: async (id: number): Promise<Monitor> => {
    const { data } = await axios.get(`${API_URL}/monitors/${id}`);
    return data;
  },

  createMonitor: async (monitor: Partial<Monitor>): Promise<Monitor> => {
    const { data } = await axios.post(`${API_URL}/monitors`, monitor);
    return data;
  },

  updateMonitor: async (id: number, monitor: Partial<Monitor>): Promise<Monitor> => {
    const { data } = await axios.put(`${API_URL}/monitors/${id}`, monitor);
    return data;
  },

  deleteMonitor: async (id: number): Promise<void> => {
    await axios.delete(`${API_URL}/monitors/${id}`);
  },

  getHeartbeats: async (id: number, limit?: number): Promise<Heartbeat[]> => {
    const params = limit ? `?limit=${limit}` : '';
    const { data } = await axios.get(`${API_URL}/monitors/${id}/heartbeats${params}`);
    return data;
  },

  getPublicStatus: async (): Promise<PublicStatus> => {
    const { data } = await axios.get(`${API_URL}/status`);
    return data;
  },

  testWebhook: async (url: string): Promise<{ success: boolean }> => {
    const { data } = await axios.post(`${API_URL}/webhooks/test`, { url });
    return data;
  },
};