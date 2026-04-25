'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Settings as SettingsIcon, ArrowLeft, Save, Mail } from 'lucide-react';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const { status } = useSession({ required: true });
  const [loading, setLoading] = useState(false);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');

  // Note: We need to implement API endpoints for these settings

  if (status === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-background-primary"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div></div>;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Stub for saving settings to the backend
      // await axios.post('/api/settings', { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, notificationEmail });
      alert('Settings saved successfully (Mock)');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background-primary">
      <header className="bg-surface sticky top-0 z-40 border-b border-surface-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-8 h-8 text-brand" />
          <h1 className="text-2xl font-bold text-text-primary">Global Settings</h1>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6 border-b border-surface-border pb-4">
            <Mail className="w-5 h-5 text-text-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">Email Notifications (SMTP)</h2>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">SMTP Host</label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={e => setSmtpHost(e.target.value)}
                  className="input-field"
                  placeholder="smtp.example.com"
                />
              </div>
              <div>
                <label className="label">SMTP Port</label>
                <input
                  type="number"
                  value={smtpPort}
                  onChange={e => setSmtpPort(parseInt(e.target.value))}
                  className="input-field"
                  placeholder="587"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">SMTP Username</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={e => setSmtpUser(e.target.value)}
                  className="input-field"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="label">SMTP Password</label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={e => setSmtpPass(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label className="label">From Email Address</label>
              <input
                type="email"
                value={smtpFrom}
                onChange={e => setSmtpFrom(e.target.value)}
                className="input-field"
                placeholder="noreply@example.com"
              />
            </div>

            <div>
              <label className="label">Send Alert Notifications To</label>
              <input
                type="email"
                value={notificationEmail}
                onChange={e => setNotificationEmail(e.target.value)}
                className="input-field"
                placeholder="admin@example.com"
              />
            </div>

            <div className="pt-6 flex justify-end">
              <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
