import { Queue } from 'bullmq';
export declare function scheduleMonitor(monitorId: number): Promise<void>;
export declare function scheduleAllMonitors(): Promise<void>;
export declare function scheduleMonitorWithInterval(monitorId: number, intervalSeconds: number): Promise<void>;
export declare function cancelMonitorSchedule(monitorId: number): Promise<void>;
export declare function getUptimePercentage(monitorId: number): Promise<number>;
export { Queue };
