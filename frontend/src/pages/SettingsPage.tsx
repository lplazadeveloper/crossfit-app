import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { orgApi, usersApi } from '../api/services';
import { useAuthStore, applyBranding } from '../store/authStore';
import { Card, Button, Input, Avatar, Badge } from '../components/ui';
import { UserRole } from '../types';

export function SettingsPage() {
  const { user, isHeadCoach, setOrg } = useAuthStore();
  const qc = useQueryClient();

  const { data: org } = useQuery({ queryKey: ['org'], queryFn: orgApi.get });

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { primaryColor: '', secondaryColor: '', accentColor: '' },
  });

  useEffect(() => {
    if (org) reset({ primaryColor: org.primaryColor, secondaryColor: org.secondaryColor, accentColor: org.accentColor });
  }, [org]);

  const saveBranding = useMutation({
    mutationFn: orgApi.updateBranding,
    onSuccess: (updated) => {
      setOrg(updated);
      applyBranding(updated);
      qc.invalidateQueries({ queryKey: ['org'] });
    },
  });

  return (
    <div className="max-w-2xl mx-auto py-8 px-6 flex flex-col gap-6">
      <h1 className="font-['Bebas_Neue'] text-3xl tracking-wide">Ajustes</h1>

      {/* Profile */}
      <Card>
        <h2 className="font-semibold mb-4">Mi perfil</h2>
        <div className="flex items-center gap-4">
          <Avatar src={user?.avatarUrl} name={user?.name ?? ''} size={56} />
          <div>
            <p className="font-medium">{user?.name}</p>
            <p className="text-sm text-[var(--color-muted)]">{user?.email}</p>
            <Badge color={user?.role === UserRole.HeadCoach ? 'var(--color-primary)' : '#8B5CF6'} className="mt-1">
              {user?.role === UserRole.HeadCoach ? 'Head Coach' : user?.role === UserRole.Coach ? 'Coach' : 'Atleta'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Branding - solo HeadCoach */}
      {isHeadCoach() && (
        <Card>
          <h2 className="font-semibold mb-1">Branding de la organización</h2>
          <p className="text-sm text-[var(--color-muted)] mb-4">
            Personaliza los colores de tu app. Los cambios se aplican a todos los usuarios.
          </p>
          <form onSubmit={handleSubmit(d => saveBranding.mutate(d))} className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-muted)]">Color principal</label>
                <div className="flex items-center gap-2">
                  <input type="color" {...register('primaryColor')} className="w-10 h-8 rounded cursor-pointer border border-[var(--color-border)] bg-transparent" />
                  <Input className="flex-1 text-xs" {...register('primaryColor')} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-muted)]">Color secundario</label>
                <div className="flex items-center gap-2">
                  <input type="color" {...register('secondaryColor')} className="w-10 h-8 rounded cursor-pointer border border-[var(--color-border)] bg-transparent" />
                  <Input className="flex-1 text-xs" {...register('secondaryColor')} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--color-muted)]">Color de acento</label>
                <div className="flex items-center gap-2">
                  <input type="color" {...register('accentColor')} className="w-10 h-8 rounded cursor-pointer border border-[var(--color-border)] bg-transparent" />
                  <Input className="flex-1 text-xs" {...register('accentColor')} />
                </div>
              </div>
            </div>
            <Button type="submit" loading={saveBranding.isPending} className="self-end">
              Guardar branding
            </Button>
          </form>
        </Card>
      )}

      {/* Organization info */}
      {org && (
        <Card>
          <h2 className="font-semibold mb-3">Organización</h2>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Nombre</span>
              <span>{org.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Slug</span>
              <code className="text-xs bg-[var(--color-surface2)] px-2 py-0.5 rounded">{org.slug}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Plan</span>
              <Badge>{org.plan}</Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
