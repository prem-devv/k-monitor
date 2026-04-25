'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Activity, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { api, Monitor, Heartbeat } from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';
import { useSession } from 'next-auth/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function MonitorDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const { data: session, status } = useSession({ required: true });

  useEffect(() => {
    if (!id) return;
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [id]);

  async function fetchData() {
    try {
      const [monitorData, heartbeatData] = await Promise.all([
        api.getMonitor(parseInt(id as string)),
        api.getHeartbeats(parseInt(id as string), 1440),
      ]);
      setMonitor(monitorData);
      setHeartbeats(heartbeatData);
    } catch (error) {
      console.error('Failed to fetch monitor:', error);
    } finally {
      setDataLoading(false);
    }
  }

  if (status === 'loading' || dataLoading || !monitor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    up: 'text-neon-green',
    down: 'text-neon-red',
    pending: 'text-neon-cyan',
  };

  const statusLabels: Record<string, string> = {
    up: 'Operational',
    down: 'Down',
    pending: 'Pending',
  };

  const chartData = [...heartbeats].reverse().map(h => ({
    time: format(h.createdAt, 'HH:mm:ss'),
    latency: h.latency || 0,
  }));

  return (
    <div className="min-h-screen">
      <header className="glass-dark sticky top-0 z-40 border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button onClick={() => router.push('/')} className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{monitor.name}</h1>
              <p className="text-mono text-text-secondary">{monitor.url}</p>
            </div>
            <div className={`flex items-center gap-3 px-6 py-3 glass-card ${monitor.status === 'up' ? 'border-neon-green/30' : 'border-neon-red/30'}`}>
              <span className={`status-dot ${monitor.status === 'up' ? 'up' : 'down'}`} />
              <span className={`text-xl font-bold ${statusColors[monitor.status]}`}>
                {statusLabels[monitor.status]}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 h-[500px]">
          <h2 className="text-xl font-bold mb-6">Latency Performance</h2>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="time" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} unit="ms" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#2563EB', fontWeight: 'bold' }}
              />
              <Line type="monotone" dataKey="latency" stroke="#2563EB" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#2563EB' }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </main>
    </div>
  );
}
