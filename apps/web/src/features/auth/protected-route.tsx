import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth-provider';

export function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'checking') {
    return <AuthLoadingScreen />;
  }

  if (auth.status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="rounded border border-slate-200 bg-white px-6 py-4 text-sm text-muted shadow-sm">
        Validating session
      </div>
    </div>
  );
}
