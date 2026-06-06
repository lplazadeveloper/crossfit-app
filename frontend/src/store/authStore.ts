import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserDto, OrganizationDto } from '../types';

interface AuthState {
  user: UserDto | null;
  org: OrganizationDto | null;
  accessToken: string | null;
  refreshToken: string | null;
  orgSlug: string | null;
  setAuth: (user: UserDto, accessToken: string, refreshToken: string) => void;
  setOrg: (org: OrganizationDto) => void;
  setOrgSlug: (slug: string) => void;
  logout: () => void;
  isCoach: () => boolean;
  isHeadCoach: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      org: null,
      accessToken: null,
      refreshToken: null,
      orgSlug: null,

      setAuth: (user, accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user, accessToken, refreshToken });
      },

      setOrg: (org) => set({ org }),

      setOrgSlug: (slug) => {
        localStorage.setItem('orgSlug', slug);
        set({ orgSlug: slug });
      },

      logout: () => {
        localStorage.clear();
        set({ user: null, org: null, accessToken: null, refreshToken: null });
      },

      isCoach: () => {
        const role = get().user?.role ?? 0;
        return role >= 1;
      },

      isHeadCoach: () => get().user?.role === 2,
    }),
    {
      name: 'crossfit-auth',
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        orgSlug: s.orgSlug,
      }),
    }
  )
);

// Apply org branding to CSS variables
export function applyBranding(org: OrganizationDto) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', org.primaryColor);
  root.style.setProperty('--color-secondary', org.secondaryColor);
  root.style.setProperty('--color-accent', org.accentColor);
}
