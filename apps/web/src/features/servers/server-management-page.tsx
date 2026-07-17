import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Database, Pencil, PlugZap, Power, Trash2, X } from 'lucide-react';
import type { MonitoredServer } from '@mysql-monitor/types';
import {
  monitoredServerCreateSchema,
  monitoredServerUpdateSchema,
  type MonitoredServerCreateInput,
  type MonitoredServerUpdateInput,
  type z
} from '@mysql-monitor/validation';
import { EmptyState } from '../../components/empty-state';
import { LoadingState } from '../../components/loading-state';
import { PageHeader } from '../../components/page-header';
import { StatusBadge } from '../../components/status-badge';
import { apiClient } from '../../services/api-client';
import { queryKeys } from '../../services/query-keys';

type SslMode = MonitoredServerCreateInput['sslMode'];
type FormMode = 'create' | 'edit';
type FormErrors = Partial<Record<keyof ServerFormState, string>>;

interface ServerFormState {
  name: string;
  host: string;
  port: string;
  username: string;
  password: string;
  sslMode: SslMode;
  enabled: boolean;
}

const emptyForm: ServerFormState = {
  name: '',
  host: '',
  port: '3306',
  username: '',
  password: '',
  sslMode: 'preferred',
  enabled: true
};

export function ServerManagementPage() {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<{ mode: FormMode; server?: MonitoredServer } | null>(null);
  const [form, setForm] = useState<ServerFormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(
    null
  );

  const serversQuery = useQuery({
    queryKey: queryKeys.servers,
    queryFn: apiClient.servers,
    retry: false
  });

  const isEdit = modal?.mode === 'edit';
  const modalTitle = isEdit ? 'Edit Server' : 'Add Server';

  const createMutation = useMutation({
    mutationFn: apiClient.createServer,
    onSuccess: async () => {
      setModal(null);
      setForm(emptyForm);
      setFeedback({ tone: 'success', message: 'Server saved successfully.' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.servers });
    },
    onError: (error) => {
      setFeedback({
        tone: 'error',
        message: messageFromError(error, 'Server could not be saved.')
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ serverId, input }: { serverId: string; input: MonitoredServerUpdateInput }) =>
      apiClient.updateServer(serverId, input),
    onSuccess: async () => {
      setModal(null);
      setForm(emptyForm);
      setFeedback({ tone: 'success', message: 'Server updated successfully.' });
      await queryClient.invalidateQueries({ queryKey: queryKeys.servers });
    },
    onError: (error) => {
      setFeedback({
        tone: 'error',
        message: messageFromError(error, 'Server could not be updated.')
      });
    }
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      if (isEdit && modal?.server) {
        return apiClient.testStoredServerConnection(modal.server.id);
      }

      const input = validateCreateForm(form);
      return apiClient.testServerConnection(input);
    },
    onSuccess: () => {
      setFeedback({ tone: 'success', message: 'Connection test succeeded.' });
    },
    onError: (error) => {
      setFeedback({
        tone: 'error',
        message: messageFromError(error, 'Connection test failed.')
      });
    }
  });

  const rowActionMutation = useMutation({
    mutationFn: async (action: { type: 'toggle' | 'delete' | 'test'; server: MonitoredServer }) => {
      if (action.type === 'delete') {
        return apiClient.deleteServer(action.server.id);
      }

      if (action.type === 'test') {
        return apiClient.testStoredServerConnection(action.server.id);
      }

      return apiClient.updateServer(action.server.id, {
        enabled: action.server.status === 'disabled'
      });
    },
    onSuccess: async (_data, action) => {
      const messages = {
        delete: 'Server deleted.',
        test: 'Connection test succeeded.',
        toggle: action.server.status === 'disabled' ? 'Server enabled.' : 'Server disabled.'
      };
      setFeedback({ tone: 'success', message: messages[action.type] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.servers });
    },
    onError: (error) => {
      setFeedback({ tone: 'error', message: messageFromError(error, 'Action failed.') });
    }
  });

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    testMutation.isPending ||
    rowActionMutation.isPending;

  const fieldProps = useMemo(
    () => ({
      disabled: createMutation.isPending || updateMutation.isPending || testMutation.isPending
    }),
    [createMutation.isPending, updateMutation.isPending, testMutation.isPending]
  );

  function openCreateModal() {
    setModal({ mode: 'create' });
    setForm(emptyForm);
    setErrors({});
    setFeedback(null);
  }

  function openEditModal(server: MonitoredServer) {
    setModal({ mode: 'edit', server });
    setForm({
      name: server.name,
      host: server.host,
      port: String(server.port),
      username: server.username,
      password: '',
      sslMode: server.sslMode,
      enabled: server.status !== 'disabled'
    });
    setErrors({});
    setFeedback(null);
  }

  function validateCreateForm(state: ServerFormState): MonitoredServerCreateInput {
    const parsed = monitoredServerCreateSchema.safeParse({
      name: state.name.trim(),
      host: state.host.trim(),
      port: state.port,
      username: state.username.trim(),
      password: state.password,
      sslMode: state.sslMode,
      enabled: state.enabled
    });

    if (!parsed.success) {
      setErrors(toFormErrors(parsed.error));
      throw new Error('Please fix the highlighted fields.');
    }

    setErrors({});
    return parsed.data;
  }

  function validateUpdateForm(state: ServerFormState): MonitoredServerUpdateInput {
    const parsed = monitoredServerUpdateSchema.safeParse({
      name: state.name.trim(),
      host: state.host.trim(),
      port: state.port,
      username: state.username.trim(),
      sslMode: state.sslMode,
      enabled: state.enabled
    });

    if (!parsed.success) {
      setErrors(toFormErrors(parsed.error));
      throw new Error('Please fix the highlighted fields.');
    }

    setErrors({});
    return parsed.data;
  }

  function saveServer() {
    setFeedback(null);

    try {
      if (isEdit && modal?.server) {
        updateMutation.mutate({ serverId: modal.server.id, input: validateUpdateForm(form) });
        return;
      }

      createMutation.mutate(validateCreateForm(form));
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFromError(error, 'Validation failed.') });
    }
  }

  function testConnection() {
    setFeedback(null);

    try {
      if (!isEdit) {
        validateCreateForm(form);
      }
      testMutation.mutate();
    } catch (error) {
      setFeedback({ tone: 'error', message: messageFromError(error, 'Validation failed.') });
    }
  }

  function deleteServer(server: MonitoredServer) {
    if (window.confirm(`Delete ${server.name}?`)) {
      rowActionMutation.mutate({ type: 'delete', server });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitored Servers"
        description="Manage read-only MySQL monitoring targets. Credentials are stored only by the API."
        actions={
          <button
            className="inline-flex h-10 items-center gap-2 rounded bg-slate-900 px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            onClick={openCreateModal}
            disabled={busy}
          >
            <Database className="h-4 w-4" aria-hidden="true" />
            Add Server
          </button>
        }
      />

      {feedback ? (
        <div
          role="status"
          className={
            feedback.tone === 'success'
              ? 'rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'
              : 'rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'
          }
        >
          {feedback.message}
        </div>
      ) : null}

      {serversQuery.isLoading ? <LoadingState /> : null}
      {serversQuery.isError ? (
        <EmptyState
          title="Server list unavailable"
          body="Start the API, apply migrations, and sign in with a user that has dashboard permissions."
        />
      ) : null}
      {serversQuery.data?.servers.length === 0 ? (
        <EmptyState
          title="No monitored servers configured"
          body="Add a MySQL server with a least-privilege monitoring account to begin collection."
        />
      ) : null}
      {serversQuery.data && serversQuery.data.servers.length > 0 ? (
        <div className="overflow-x-auto rounded border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Host</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">SSL</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {serversQuery.data.servers.map((server) => (
                <tr key={server.id}>
                  <td className="px-4 py-3 font-medium">{server.name}</td>
                  <td className="px-4 py-3 text-muted">
                    {server.host}:{server.port}
                  </td>
                  <td className="px-4 py-3 text-muted">{server.username}</td>
                  <td className="px-4 py-3 text-muted">{server.sslMode}</td>
                  <td className="px-4 py-3">
                    <StatusBadge label={server.status} tone="neutral" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <IconButton
                        label={`Edit ${server.name}`}
                        disabled={busy}
                        onClick={() => openEditModal(server)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        label={`Test ${server.name}`}
                        disabled={busy}
                        onClick={() => rowActionMutation.mutate({ type: 'test', server })}
                      >
                        <PlugZap className="h-4 w-4" aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        label={
                          server.status === 'disabled'
                            ? `Enable ${server.name}`
                            : `Disable ${server.name}`
                        }
                        disabled={busy}
                        onClick={() => rowActionMutation.mutate({ type: 'toggle', server })}
                      >
                        <Power className="h-4 w-4" aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        label={`Delete ${server.name}`}
                        disabled={busy}
                        onClick={() => deleteServer(server)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {modal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="server-dialog-title"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded border border-slate-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 id="server-dialog-title" className="text-lg font-semibold text-ink">
                  {modalTitle}
                </h2>
                <p className="mt-1 text-sm text-muted">Connection settings for a MySQL target.</p>
              </div>
              <button
                className="rounded p-2 text-muted hover:bg-slate-100 hover:text-ink"
                onClick={() => setModal(null)}
                aria-label="Close server form"
                disabled={busy}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
              <Field label="Server name" error={errors.name}>
                <input
                  className={inputClass(errors.name)}
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  {...fieldProps}
                />
              </Field>
              <Field label="Host" error={errors.host}>
                <input
                  className={inputClass(errors.host)}
                  value={form.host}
                  onChange={(event) => setForm({ ...form, host: event.target.value })}
                  {...fieldProps}
                />
              </Field>
              <Field label="Port" error={errors.port}>
                <input
                  className={inputClass(errors.port)}
                  inputMode="numeric"
                  value={form.port}
                  onChange={(event) => setForm({ ...form, port: event.target.value })}
                  {...fieldProps}
                />
              </Field>
              <Field label="Username" error={errors.username}>
                <input
                  className={inputClass(errors.username)}
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                  {...fieldProps}
                />
              </Field>
              <Field label="Password" error={errors.password}>
                <input
                  className={inputClass(errors.password)}
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  disabled={fieldProps.disabled || isEdit}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="SSL mode" error={errors.sslMode}>
                <select
                  className={inputClass(errors.sslMode)}
                  value={form.sslMode}
                  onChange={(event) => setForm({ ...form, sslMode: event.target.value as SslMode })}
                  {...fieldProps}
                >
                  <option value="disabled">Disabled</option>
                  <option value="preferred">Preferred</option>
                  <option value="required">Required</option>
                </select>
              </Field>
              <label className="flex items-center gap-3 rounded border border-slate-200 px-3 py-3 text-sm text-slate-700 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
                  {...fieldProps}
                />
                Enabled status
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-5">
                {feedback ? (
                  <div
                    role="status"
                    className={
                      feedback.tone === 'success'
                        ? 'inline-flex items-center gap-2 text-sm text-emerald-700'
                        : 'text-sm text-red-700'
                    }
                  >
                    {feedback.tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : null}
                    {feedback.message}
                  </div>
                ) : null}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  className="h-10 rounded border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={testConnection}
                  disabled={busy}
                >
                  {testMutation.isPending ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                  className="h-10 rounded bg-slate-900 px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={saveServer}
                  disabled={busy}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : 'Save Server'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  error,
  children
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      {children}
      {error ? <span className="text-xs font-normal text-red-700">{error}</span> : null}
    </label>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function inputClass(error?: string) {
  return [
    'h-10 rounded border bg-white px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100',
    error ? 'border-red-300' : 'border-slate-300'
  ].join(' ');
}

function toFormErrors(error: z.ZodError): FormErrors {
  return error.issues.reduce<FormErrors>((result, issue) => {
    const key = issue.path[0];

    if (typeof key === 'string' && key in emptyForm) {
      result[key as keyof ServerFormState] = issue.message;
    }

    return result;
  }, {});
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
