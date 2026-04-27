'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Activity, Server, Globe, CheckCircle, XCircle, AlertTriangle, Settings, ExternalLink, Trash2, Edit, X } from 'lucide-react';
import { api, Monitor } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { useSession, signOut } from 'next-auth/react';

export default function Dashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const { data: session, status } = useSession({ required: true });

  const [showAccountMenu, setShowAccountMenu] = useState(false);

  useEffect(() => {
    fetchMonitors();
    const intervalId = setInterval(fetchMonitors, 3000);
    return () => clearInterval(intervalId);
  }, []);

  async function fetchMonitors() {
    try {
      const data = await api.getMonitors();
      setMonitors(data);
    } catch (error) {
      console.error('Failed to fetch monitors:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.deleteMonitor(id);
      setMonitors(monitors.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete monitor:', error);
    }
  }

  const monitorsWithLatency = monitors.filter(m => m.latency);
  const avgLatency = monitorsWithLatency.length > 0
    ? Math.round(monitorsWithLatency.reduce((acc, m) => acc + (m.latency || 0), 0) / monitorsWithLatency.length)
    : 0;

  const stats = {
    total: monitors.length,
    up: monitors.filter(m => m.status === 'up').length,
    down: monitors.filter(m => m.status === 'down').length,
    avgLatency
  };

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center p-8 bg-background-primary"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div></div>;
  }

  return (
    <div className="min-h-screen">
      <header className="glass-dark sticky top-0 z-40 border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-neon-cyan" />
              <span className="text-xl font-bold text-mono text-neon-cyan">K-MONITOR</span>
            </div>
            <nav className="flex items-center relative">
              <button 
                onClick={() => setShowAccountMenu(!showAccountMenu)} 
                className="flex items-center gap-3 py-1 px-2 rounded-lg hover:bg-surface-light transition-colors focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold">
                  {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'U'}
                </div>
                <span className="text-sm font-medium text-text-primary hidden sm:block">
                  {session?.user?.name || session?.user?.email || 'Account'}
                </span>
              </button>

              <AnimatePresence>
                {showAccountMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-48 rounded-lg shadow-xl shadow-black/50 glass-dark border border-surface-border overflow-hidden z-50 transform origin-top-right mix-blend-normal"
                  >
                    <div className="py-1">
                      <a href="/status" className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-light hover:text-text-primary transition-colors">
                        <Globe className="w-4 h-4" />
                        Public Status
                      </a>
                      <a href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-light hover:text-text-primary transition-colors">
                        <Settings className="w-4 h-4" />
                        Settings
                      </a>
                      <div className="h-px bg-surface-border my-1"></div>
                      <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors">
                         Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Monitors" value={stats.total} icon={Server} color="cyan" />
          <StatCard label="Operational" value={stats.up} icon={CheckCircle} color="green" />
          <StatCard label="Down" value={stats.down} icon={XCircle} color="red" />
          <StatCard label="Avg Response" value={`${stats.avgLatency}ms`} icon={Activity} color="yellow" />
        </div>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Monitors</h1>
          <button onClick={() => { setEditingMonitor(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Monitor
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : monitors.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Server className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <p className="text-text-secondary mb-4">No monitors configured yet</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Create your first monitor
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {monitors.map((monitor) => (
              <MonitorCard key={monitor.id} monitor={monitor} onDelete={handleDelete} onEdit={() => { setEditingMonitor(monitor); setShowModal(true); }} />
            ))}
          </div>
        )}
      </main>

      <AnimatePresence>
        {showModal && (
          <MonitorModal
            monitor={editingMonitor}
            onClose={() => { setShowModal(false); setEditingMonitor(null); }}
            onSave={() => { setShowModal(false); fetchMonitors(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  const colorClasses: Record<string, string> = {
    green: 'text-neon-green border-neon-green/30',
    red: 'text-neon-red border-neon-red/30',
    yellow: 'text-neon-yellow border-neon-yellow/30',
    cyan: 'text-neon-cyan border-neon-cyan/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card p-4 border-l-4 ${colorClasses[color]}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-secondary text-sm">{label}</p>
          <p className="text-2xl font-bold text-mono">{value}</p>
        </div>
        <Icon className={`w-6 h-6 ${colorClasses[color].split(' ')[0]}`} />
      </div>
    </motion.div>
  );
}

function MonitorCard({ monitor, onDelete, onEdit }: { monitor: Monitor; onDelete: (id: number) => void; onEdit: () => void }) {
  const statusColors: Record<string, string> = {
    up: 'text-neon-green',
    down: 'text-neon-red',
    pending: 'text-neon-cyan',
    degraded: 'text-neon-yellow',
  };

  const statusLabels: Record<string, string> = {
    up: 'Operational',
    down: 'Down',
    pending: 'Pending',
    degraded: 'Degraded',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className={`status-dot ${monitor.status === 'up' ? 'up' : monitor.status === 'down' ? 'down' : 'pending'}`} />
          <div>
            <h3 className="font-semibold">{monitor.name}</h3>
            <p className="text-xs text-text-secondary uppercase">{monitor.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-2 text-text-muted hover:text-text-primary transition-colors">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(monitor.id)} className="p-2 text-text-muted hover:text-neon-red transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-mono text-text-secondary truncate">{monitor.url}</p>
        <div className="flex items-center justify-between text-sm">
          <span className={`${statusColors[monitor.status]} font-medium`}>
            {statusLabels[monitor.status]}
          </span>
          <span className="text-text-muted">{monitor.uptime.toFixed(1)}% uptime</span>
        </div>
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>{monitor.latency ? `${monitor.latency}ms` : '-'}</span>
          <span>{formatDistanceToNow(monitor.updatedAt, { addSuffix: true })}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-border">
        <a href={`/monitor/${monitor.id}`} className="flex items-center gap-1 text-xs text-neon-cyan hover:underline">
          <ExternalLink className="w-3 h-3" />
          View Details
        </a>
      </div>
    </motion.div>
  );
}

function MonitorModal({ monitor, onClose, onSave }: { monitor: Monitor | null; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    name: monitor?.name || '',
    type: monitor?.type || 'http',
    url: monitor?.url || '',
    port: monitor?.port || 80,
    interval: monitor?.interval || 60,
    timeout: monitor?.timeout || 10,
    keyword: monitor?.keyword || '',
    expectedStatus: monitor?.expectedStatus || 200,
    webhookUrl: monitor?.webhookUrl || '',
    isPublic: monitor?.isPublic || false,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (monitor) {
        await api.updateMonitor(monitor.id, formData);
      } else {
        await api.createMonitor(formData);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save monitor:', error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-surface-border">
          <h2 className="text-xl font-bold">{monitor ? 'Edit Monitor' : 'Add Monitor'}</h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="My Website"
              required
            />
          </div>

          <div>
            <label className="label">Type</label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as any })}
              className="select-field"
            >
              <option value="http">HTTP/HTTPS</option>
              <option value="tcp">TCP</option>
              <option value="icmp">ICMP Ping</option>
              <option value="ssl">SSL Certificate</option>
              <option value="dns">DNS Resolution</option>
            </select>
          </div>

          <div>
            <label className="label">{formData.type === 'http' ? 'URL' : 'Host/IP'}</label>
            <input
              type="text"
              value={formData.url}
              onChange={e => setFormData({ ...formData, url: e.target.value })}
              className="input-field"
              placeholder={formData.type === 'http' ? 'https://example.com' : formData.type === 'dns' ? 'example.com' : '192.168.1.1'}
              required
            />
          </div>

          {(formData.type === 'tcp' || formData.type === 'icmp' || formData.type === 'ssl') && (
            <div>
              <label className="label">Port</label>
              <input
                type="number"
                value={formData.port}
                onChange={e => setFormData({ ...formData, port: parseInt(e.target.value) })}
                className="input-field"
                placeholder={formData.type === 'ssl' ? '443' : '80'}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Interval (seconds)</label>
              <input
                type="number"
                value={formData.interval}
                onChange={e => setFormData({ ...formData, interval: parseInt(e.target.value) })}
                className="input-field"
                min="5"
                max="3600"
              />
            </div>
            <div>
              <label className="label">Timeout (seconds)</label>
              <input
                type="number"
                value={formData.timeout}
                onChange={e => setFormData({ ...formData, timeout: parseInt(e.target.value) })}
                className="input-field"
                min="5"
                max="30"
              />
            </div>
          </div>

          {formData.type === 'http' && (
            <>
              <div>
                <label className="label">Expected Status Code</label>
                <input
                  type="number"
                  value={formData.expectedStatus}
                  onChange={e => setFormData({ ...formData, expectedStatus: parseInt(e.target.value) })}
                  className="input-field"
                  placeholder="200"
                />
              </div>
              <div>
                <label className="label">Keyword (optional)</label>
                <input
                  type="text"
                  value={formData.keyword}
                  onChange={e => setFormData({ ...formData, keyword: e.target.value })}
                  className="input-field"
                  placeholder="OK"
                />
              </div>
            </>
          )}

          <div>
            <label className="label">Webhook URL (optional)</label>
            <input
              type="url"
              value={formData.webhookUrl}
              onChange={e => setFormData({ ...formData, webhookUrl: e.target.value })}
              className="input-field"
              placeholder="https://webhook.example.com/notify"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={formData.isPublic}
              onChange={e => setFormData({ ...formData, isPublic: e.target.checked })}
              className="w-4 h-4 rounded border-surface-border bg-background-tertiary text-neon-cyan focus:ring-neon-cyan"
            />
            <label htmlFor="isPublic" className="text-sm text-text-secondary">Show on public status page</label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}