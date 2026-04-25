'use client';

import { signIn } from 'next-auth/react';
import { Activity } from 'lucide-react';
import { useState } from 'react';

export default function SignIn() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLocalAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    signIn('credentials', { username, password, callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-background-primary flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-brand">
          <Activity className="w-12 h-12" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-text-primary">
          Sign in to K-Monitor
        </h2>
        <p className="mt-2 text-center text-sm text-text-secondary">
          Secure Uptime Monitoring
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass-card py-8 px-4 sm:px-10">
          <div className="space-y-6">
            <button
              onClick={() => signIn('github', { callbackUrl: '/' })}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors"
            >
              Sign in with GitHub
            </button>
            <button
              onClick={() => signIn('google', { callbackUrl: '/' })}
              className="w-full flex justify-center py-2 px-4 border border-surface-border rounded-md shadow-sm text-sm font-medium text-text-primary bg-white hover:bg-gray-50 transition-colors"
            >
              Sign in with Google
            </button>
            <button
              onClick={() => signIn('authentik', { callbackUrl: '/' })}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Sign in with Authentik
            </button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-surface-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-text-muted">Or login locally</span>
              </div>
            </div>
            <form onSubmit={handleLocalAdminLogin} className="space-y-4 border border-surface-border p-4 rounded-md">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-background-primary border border-surface-border rounded-md text-text-primary outline-none focus:border-brand transition-colors"
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-background-primary border border-surface-border rounded-md text-text-primary outline-none focus:border-brand transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand hover:bg-brand-hover transition-colors"
              >
                Sign In
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
