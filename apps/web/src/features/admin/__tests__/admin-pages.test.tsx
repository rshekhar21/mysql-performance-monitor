// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersPage } from '../users-page';
import { AuditPage } from '../audit-page';
import { SettingsPage } from '../settings-page';
import { apiClient } from '../../../services/api-client';

vi.mock('../../../services/api-client', () => ({
  apiClient: {
    users: vi.fn(),
    auditLogs: vi.fn(),
    settings: vi.fn()
  }
}));

describe('admin pages', () => {
  beforeEach(() => {
    vi.mocked(apiClient.users).mockResolvedValue({
      users: [
        {
          id: 'user-1',
          email: 'admin@example.test',
          displayName: 'Admin',
          disabled: false,
          roles: ['super_admin'],
          lastLoginAt: null,
          failedLoginCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ]
    });
    vi.mocked(apiClient.auditLogs).mockResolvedValue({
      logs: [
        {
          id: 'audit-1',
          actorUserId: 'user-1',
          actorEmail: 'admin@example.test',
          action: 'monitored_server.create',
          entityType: 'monitored_server',
          entityId: 'server-1',
          requestId: 'req-1',
          ipAddress: '127.0.0.1',
          createdAt: '2026-01-01T00:00:00.000Z'
        }
      ]
    });
    vi.mocked(apiClient.settings).mockResolvedValue({
      settings: [{ key: 'retention.days', value: 30, updatedAt: '2026-01-01T00:00:00.000Z' }]
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders users and roles from the API', async () => {
    renderWithClient(<UsersPage />);

    expect(await screen.findByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('super_admin')).toBeInTheDocument();
  });

  it('renders audit logs from the API', async () => {
    renderWithClient(<AuditPage />);

    expect(await screen.findByText('monitored_server.create')).toBeInTheDocument();
    expect(screen.getByText('admin@example.test')).toBeInTheDocument();
  });

  it('renders settings from the API', async () => {
    renderWithClient(<SettingsPage />);

    expect(await screen.findByText('retention.days')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });
});

function renderWithClient(element: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
}
