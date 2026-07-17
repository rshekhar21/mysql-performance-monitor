// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@mysql-monitor/types';
import { useAuth } from '../auth-context';
import { AuthProvider } from '../auth-provider';
import { ProtectedRoute } from '../protected-route';
import { ApiClientError, apiClient } from '../../../services/api-client';

vi.mock('../../../services/api-client', () => {
  class MockApiClientError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code?: string
    ) {
      super(message);
    }
  }

  return {
    ApiClientError: MockApiClientError,
    authTokenStorage: {
      get: () => localStorage.getItem('authToken'),
      set: (token: string) => localStorage.setItem('authToken', token),
      clear: () => localStorage.removeItem('authToken')
    },
    apiClient: {
      me: vi.fn(),
      logout: vi.fn()
    }
  };
});

const user: User = {
  id: 'user-1',
  email: 'admin@example.test',
  displayName: 'Admin',
  disabled: false,
  roles: ['super_admin'],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
};

describe('auth route protection', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(apiClient.me).mockReset();
    vi.mocked(apiClient.logout).mockReset();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('redirects a fresh browser with no token to login', async () => {
    renderAuthRoutes('/');

    expect(await screen.findByText('Login')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(apiClient.me).not.toHaveBeenCalled();
  });

  it('validates a token before opening the dashboard', async () => {
    localStorage.setItem('authToken', 'valid-token');
    vi.mocked(apiClient.me).mockResolvedValue({ user });

    renderAuthRoutes('/');

    expect(screen.getByText('Validating session')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('clears an invalid token and redirects to login', async () => {
    localStorage.setItem('authToken', 'expired-token');
    vi.mocked(apiClient.me).mockRejectedValue(
      new ApiClientError('Authentication failed.', 401, 'AUTHENTICATION_FAILED')
    );

    renderAuthRoutes('/');

    expect(await screen.findByText('Login')).toBeInTheDocument();
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('logs out, clears local state, and redirects to login', async () => {
    localStorage.setItem('authToken', 'valid-token');
    vi.mocked(apiClient.me).mockResolvedValue({ user });
    vi.mocked(apiClient.logout).mockResolvedValue({ ok: true });

    renderAuthRoutes('/');

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    await waitFor(() => expect(screen.getByText('Login')).toBeInTheDocument());
    expect(apiClient.logout).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('authToken')).toBeNull();
  });

  it('does not render protected content while validation is pending', () => {
    localStorage.setItem('authToken', 'pending-token');
    vi.mocked(apiClient.me).mockReturnValue(new Promise(() => undefined));

    renderAuthRoutes('/');

    expect(screen.getByText('Validating session')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});

function renderAuthRoutes(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/login" element={<div>Login</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Dashboard />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function Dashboard() {
  const auth = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      Dashboard
      <button
        onClick={() => {
          void auth.logout().then(() => navigate('/login'));
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
