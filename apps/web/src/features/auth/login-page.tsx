import { Database } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api-client';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@example.test');
  const [password, setPassword] = useState('change-this-local-password');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);

    try {
      const result = await apiClient.login({ email, password });
      localStorage.setItem('authToken', result.token);
      void navigate('/');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <form className="w-full max-w-sm rounded border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <Database className="h-7 w-7 text-brand" aria-hidden="true" />
          <div>
            <h1 className="text-lg font-semibold text-ink">MySQL Monitor</h1>
            <p className="text-sm text-muted">Sign in to continue</p>
          </div>
        </div>
        <label className="mb-4 block text-sm font-medium">
          Email
          <input
            className="mt-1 h-10 w-full rounded border border-slate-300 px-3"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="mb-6 block text-sm font-medium">
          Password
          <input
            className="mt-1 h-10 w-full rounded border border-slate-300 px-3"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="mb-4 text-sm text-critical">{error}</p> : null}
        <button
          className="h-10 w-full rounded bg-slate-900 text-sm font-medium text-white disabled:opacity-60"
          type="button"
          disabled={submitting}
          onClick={() => {
            void submit();
          }}
        >
          {submitting ? 'Signing In' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
