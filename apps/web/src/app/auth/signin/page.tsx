'use client';

import { signIn } from 'next-auth/react';
import { Activity } from 'lucide-react';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SignInForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleLocalAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    signIn('credentials', { username, password, callbackUrl });
  };

  return (
    <form onSubmit={handleLocalAdminLogin} className="space-y-4">
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
  );
}

export default function SignIn() {
  return (
    <div className="min-h-screen bg-background-primary flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-brand">
          <Activity className="w-12 h-12" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-text-primary">
          Sign in to Pulse
        </h2>
        <p className="mt-2 text-center text-sm text-text-secondary">
          Admin Login
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="glass-card py-8 px-4 sm:px-10">
          <Suspense fallback={<div>Loading...</div>}>
            <SignInForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
