import { NavLink, Outlet } from 'react-router-dom';
import { Calendar, Dumbbell, Users, Settings, LogOut, BarChart3, Calculator, ChevronRight, ListChecks } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/services';
import { Avatar } from '../ui';

const NAV_COACH = [
  { to: '/calendar',  icon: Calendar,    label: 'Calendario' },
  { to: '/programs',  icon: Dumbbell,    label: 'Programas' },
  { to: '/athletes',  icon: Users,       label: 'Atletas' },
  { group: 'Análisis de carga' },
  { to: '/load',      icon: BarChart3,   label: 'Dashboard carga' },
  { to: '/rms',       icon: Calculator,  label: 'Tabla de RMs' },
  { to: '/planning',  icon: ListChecks,  label: 'Planificación' },
  { group: '' },
  { to: '/settings',  icon: Settings,    label: 'Ajustes' },
];

const NAV_ATHLETE = [
  { to: '/calendar',  icon: Calendar,    label: 'Mi Calendario' },
  { to: '/load',      icon: BarChart3,   label: 'Mi carga' },
  { to: '/settings',  icon: Settings,    label: 'Perfil' },
];

export function AppLayout() {
  const { user, org, logout, isCoach } = useAuthStore();
  const nav = isCoach() ? NAV_COACH : NAV_ATHLETE;

  const handleLogout = async () => {
    await authApi.logout().catch(() => {});
    logout();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-60 flex-shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col">
        <div className="px-5 py-5 border-b border-[var(--color-border)]">
          {org?.logoUrl ? (
            <img src={org.logoUrl} alt={org.name} className="h-8 object-contain" />
          ) : (
            <span className="font-['Bebas_Neue'] text-2xl tracking-wider text-[var(--color-primary)]">
              {org?.name ?? 'CrossFit App'}
            </span>
          )}
        </div>

        <nav className="flex-1 py-4 px-3 flex flex-col gap-0.5 overflow-y-auto">
          {nav.map((item, i) => {
            if ('group' in item) {
              return item.group ? (
                <p key={i} className="text-[10px] uppercase tracking-widest text-[var(--color-muted)] px-3 pt-4 pb-1">
                  {item.group}
                </p>
              ) : <div key={i} className="h-px bg-[var(--color-border)] mx-3 my-2" />;
            }
            const { to, icon: Icon, label } = item as { to: string; icon: any; label: string };
            return (
              <NavLink key={to} to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface2)] hover:text-[var(--color-text)]'
                  }`
                }>
                <Icon size={17} />
                <span>{label}</span>
                <ChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-30 transition-opacity" />
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-3 mb-3">
            <Avatar src={user?.avatarUrl} name={user?.name ?? '?'} size={36} />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-[var(--color-muted)] truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 text-xs text-[var(--color-muted)] hover:text-red-400 transition-colors px-1 py-1">
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-[var(--color-bg)]">
        <Outlet />
      </main>
    </div>
  );
}
