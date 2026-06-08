import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore, applyBranding } from './store/authStore';
import { orgApi } from './api/services';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { CalendarView } from './components/calendar/CalendarView';
import { SessionDetail } from './components/session/SessionDetail';
import { ProgramsPage } from './components/program/ProgramsPage';
import { AthletesPage } from './pages/AthletesPage';
import { SettingsPage } from './pages/SettingsPage';
import { CoachLoadOverview } from './components/load/CoachLoadDashboard';
import { RMTablePage } from './components/load/RMTablePage';
import { MesocyclePage } from './components/load/MesocyclePage';

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60, retry: 1 } },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, orgSlug, setOrg } = useAuthStore();

  useEffect(() => {
    if (user && orgSlug) {
      orgApi.get().then(org => { setOrg(org); applyBranding(org); }).catch(() => {});
    }
  }, [user, orgSlug]);

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AuthGuard><AppLayout /></AuthGuard>}>
            <Route index element={<Navigate to="/calendar" replace />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="sessions/:id" element={<SessionDetail />} />
            <Route path="programs" element={<ProgramsPage />} />
            <Route path="athletes" element={<AthletesPage />} />
            <Route path="load" element={<CoachLoadOverview />} />
            <Route path="rms" element={<RMTablePage />} />
            <Route path="planning" element={<MesocyclePage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
