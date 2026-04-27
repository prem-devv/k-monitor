import { Worker } from 'bullmq';
interface MonitorJob {
    monitorId: number;
    type: 'http' | 'tcp' | 'icmp' | 'ssl' | 'dns';
    url: string;
    port?: number;
    timeout: number;
    keyword?: string;
    expectedStatus?: number;
}
export declare function createWorker(): Worker<MonitorJob, {
    up: boolean;
    latency: number;
    message: string;
}, string>;
export {};
