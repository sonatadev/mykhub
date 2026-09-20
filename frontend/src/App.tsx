import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore } from '@/lib/store/auth';
import { applyUserTheme } from '@/lib/theme';
import { setUnauthorizedHandler } from '@/lib/api';
import AuthPage from '@/pages/AuthPage';
import AppLayout from '@/pages/AppLayout';
import SpaceHome from '@/pages/SpaceHome';
import PageEditor from '@/pages/PageEditor';
import EmptyWorkspace from '@/pages/EmptyWorkspace';

function ProtectedShell() {
  const status = useAuthStore((s) => s.status);
  if (status === 'idle' || status === 'loading') return null;
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  return <AppLayout />;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  if (status === 'ready') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const logout = useAuthStore((s) => s.logout);
  const settings = useAuthStore((s) => s.user?.settings);

  useEffect(() => {
    bootstrap();
    setUnauthorizedHandler(() => logout());
  }, [bootstrap, logout]);

  useEffect(() => {
    applyUserTheme(settings);
  }, [settings]);

  return (
    <TooltipProvider delayDuration={300}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <AuthPage mode="login" />
              </PublicOnly>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnly>
                <AuthPage mode="register" />
              </PublicOnly>
            }
          />
          <Route path="/" element={<ProtectedShell />}>
            <Route index element={<EmptyWorkspace />} />
            <Route path="space/:spaceId" element={<SpaceHome />} />
            <Route path="space/:spaceId/page/:pageId" element={<PageEditor />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </TooltipProvider>
  );
}
