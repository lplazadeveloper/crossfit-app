import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, applyBranding } from '../../store/authStore';
import { authApi, orgApi } from '../../api/services';
import { Spinner } from '../../components/ui';

declare global {
  interface Window {
    google: any;
    handleGoogleCredential: (response: { credential: string }) => void;
  }
}

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth, setOrg, setOrgSlug, orgSlug, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgInput, setOrgInput] = useState(orgSlug ?? '');
  const orgInputRef = useRef(orgSlug ?? ''); const initialized = useRef(false);

  useEffect(() => { if (user) navigate('/calendar'); }, [user]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  useEffect(() => {
    window.handleGoogleCredential = async ({ credential }: { credential: string }) => {
      if (!orgInputRef.current.trim()) { setError('Introduce el código de tu organización'); return; }
  setLoading(true);
  setError(null);
      try {
        setOrgSlug(orgInputRef.current.trim());
        const auth = await authApi.loginWithGoogle(credential);
        setAuth(auth.user, auth.accessToken, auth.refreshToken);
        const org = await orgApi.get();
        setOrg(org);
        applyBranding(org);
        navigate('/calendar');
      } catch (e: any) {
        setError(e.response?.data?.error ?? 'Error al iniciar sesión. Verifica el código de organización.');
      } finally {
        setLoading(false);
      }
    };
  }, [orgInput]);

  useEffect(() => {
    if (initialized.current) return;

    const initBtn = () => {
      if (!window.google?.accounts) return false;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: window.handleGoogleCredential,
        auto_select: false,
      });
      window.google.accounts.id.renderButton(
        document.getElementById('google-btn'),
        { theme: 'filled_black', size: 'large', width: 300, text: 'continue_with' }
      );
      initialized.current = true;
      return true;
    };

    if (!initBtn()) {
      const interval = setInterval(() => {
        if (initBtn()) clearInterval(interval);
      }, 200);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4">
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'linear-gradient(var(--color-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-['Bebas_Neue'] text-5xl tracking-widest text-[var(--color-primary)] leading-none">
            LP<br />Program
          </h1>
          <p className="text-sm text-[var(--color-muted)] mt-2">Tu plataforma de programación</p>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-muted)] uppercase tracking-wider">
              Código de organización
            </label>
            <input
              type="text"
              placeholder="ej: lp-program"
              value={orgInput}
              onChange={e => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                setOrgInput(val);
                orgInputRef.current = val;
              }} className="bg-[var(--color-surface2)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]"
            />
            <p className="text-xs text-[var(--color-muted)]">
              Tu entrenador te habrá dado este código
            </p>
          </div>

          <div className="relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10 bg-[var(--color-surface)]/80 rounded-lg">
                <Spinner size={24} />
              </div>
            )}
            <div id="google-btn" className="w-full" />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <p className="text-xs text-center text-[var(--color-muted)]">
            Al continuar aceptas nuestros <a href="#" className="underline">términos de uso</a>
          </p>
        </div>
      </div>
    </div>
  );
}
