import type { User } from '@mysql-monitor/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext, type AuthStatus } from './auth-context';
import { ApiClientError, apiClient, authTokenStorage } from '../../services/api-client';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>(() =>
    authTokenStorage.get() ? 'checking' : 'unauthenticated'
  );
  const [user, setUser] = useState<User | null>(null);

  const clearAuthState = useCallback(() => {
    authTokenStorage.clear();
    setUser(null);
    setStatus('unauthenticated');
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    let cancelled = false;
    const token = authTokenStorage.get();

    if (!token) {
      clearAuthState();
      return;
    }

    setStatus('checking');
    void apiClient
      .me()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setUser(result.user);
        setStatus('authenticated');
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
          clearAuthState();
          return;
        }

        clearAuthState();
      });

    return () => {
      cancelled = true;
    };
  }, [clearAuthState]);

  const login = useCallback((token: string, nextUser: User) => {
    authTokenStorage.set(token);
    setUser(nextUser);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      if (authTokenStorage.get()) {
        await apiClient.logout();
      }
    } catch {
      // Logging out must always clear local auth state, even if the server token is already invalid.
    } finally {
      clearAuthState();
    }
  }, [clearAuthState]);

  const value = useMemo(
    () => ({
      status,
      user,
      login,
      logout
    }),
    [login, logout, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
