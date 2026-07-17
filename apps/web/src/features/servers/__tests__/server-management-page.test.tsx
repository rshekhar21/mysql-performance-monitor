// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MonitoredServer } from '@mysql-monitor/types';
import { ServerManagementPage } from '../server-management-page';
import { apiClient } from '../../../services/api-client';

vi.mock('../../../services/api-client', () => ({
  apiClient: {
    servers: vi.fn(),
    createServer: vi.fn(),
    updateServer: vi.fn(),
    deleteServer: vi.fn(),
    testServerConnection: vi.fn(),
    testStoredServerConnection: vi.fn()
  }
}));

const server: MonitoredServer = {
  id: 'server-1',
  name: 'Primary DB',
  host: '127.0.0.1',
  port: 3306,
  username: 'monitor',
  sslMode: 'preferred',
  status: 'enabled',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

describe('ServerManagementPage', () => {
  beforeEach(() => {
    vi.mocked(apiClient.servers).mockReset();
    vi.mocked(apiClient.createServer).mockReset();
    vi.mocked(apiClient.updateServer).mockReset();
    vi.mocked(apiClient.deleteServer).mockReset();
    vi.mocked(apiClient.testServerConnection).mockReset();
    vi.mocked(apiClient.testStoredServerConnection).mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('opens the add server form', async () => {
    vi.mocked(apiClient.servers).mockResolvedValue({ servers: [] });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Add Server' }));

    expect(screen.getByRole('dialog', { name: 'Add Server' })).toBeInTheDocument();
    expect(screen.getByLabelText('Port')).toHaveValue('3306');
    expect(screen.getByLabelText('Enabled status')).toBeChecked();
  });

  it('validates required fields before saving', async () => {
    vi.mocked(apiClient.servers).mockResolvedValue({ servers: [] });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Add Server' }));
    fireEvent.change(screen.getByLabelText('Port'), { target: { value: '70000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Server' }));

    await waitFor(() =>
      expect(screen.getAllByText('Please fix the highlighted fields.').length).toBeGreaterThan(0)
    );
    expect(apiClient.createServer).not.toHaveBeenCalled();
  });

  it('tests a new connection successfully', async () => {
    vi.mocked(apiClient.servers).mockResolvedValue({ servers: [] });
    vi.mocked(apiClient.testServerConnection).mockResolvedValue({ ok: true });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Add Server' }));
    fillServerForm();
    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));

    await waitFor(() =>
      expect(screen.getAllByText('Connection test succeeded.').length).toBeGreaterThan(0)
    );
    expect(apiClient.testServerConnection).toHaveBeenCalledWith({
      name: 'Primary DB',
      host: '127.0.0.1',
      port: 3306,
      username: 'monitor',
      password: 'secret-password',
      sslMode: 'preferred',
      enabled: true
    });
  });

  it('shows failed test connection feedback', async () => {
    vi.mocked(apiClient.servers).mockResolvedValue({ servers: [] });
    vi.mocked(apiClient.testServerConnection).mockRejectedValue(
      new Error('The monitored server is unavailable.')
    );

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Add Server' }));
    fillServerForm();
    fireEvent.click(screen.getByRole('button', { name: 'Test Connection' }));

    await waitFor(() =>
      expect(screen.getAllByText('The monitored server is unavailable.').length).toBeGreaterThan(0)
    );
  });

  it('creates a server and closes the form', async () => {
    vi.mocked(apiClient.servers)
      .mockResolvedValueOnce({ servers: [] })
      .mockResolvedValueOnce({ servers: [server] });
    vi.mocked(apiClient.createServer).mockResolvedValue({ server });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Add Server' }));
    fillServerForm();
    fireEvent.click(screen.getByRole('button', { name: 'Save Server' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Server saved successfully.')).toBeInTheDocument();
    expect(screen.getByText('Primary DB')).toBeInTheDocument();
  });

  it('invalidates the server list and refreshes after create', async () => {
    vi.mocked(apiClient.servers)
      .mockResolvedValueOnce({ servers: [] })
      .mockResolvedValueOnce({ servers: [server] });
    vi.mocked(apiClient.createServer).mockResolvedValue({ server });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Add Server' }));
    fillServerForm();
    fireEvent.click(screen.getByRole('button', { name: 'Save Server' }));

    await waitFor(() => expect(apiClient.servers).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Primary DB')).toBeInTheDocument();
  });
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ServerManagementPage />
    </QueryClientProvider>
  );
}

function fillServerForm() {
  fireEvent.change(screen.getByLabelText('Server name'), { target: { value: 'Primary DB' } });
  fireEvent.change(screen.getByLabelText('Host'), { target: { value: '127.0.0.1' } });
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'monitor' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret-password' } });
}
