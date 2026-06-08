import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../api/services';
import { UserRole, type UserDto } from '../types';
import { Card, Avatar, Badge, Button, Modal, Select, EmptyState } from '../components/ui';
import { Users, Calendar, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AthletesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [roleTarget, setRoleTarget] = useState<UserDto | null>(null);
  const [newRole, setNewRole] = useState<UserRole>(UserRole.Athlete);

  const { data: athletes } = useQuery({
    queryKey: ['athletes'],
    queryFn: () => usersApi.list(),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => usersApi.changeRole(id, role),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['athletes'] }); setRoleTarget(null); },
  });

  const roleColor = (role: UserRole) =>
    role === UserRole.HeadCoach ? 'var(--color-primary)'
    : role === UserRole.Coach ? '#8B5CF6'
    : '#6B7280';

  const roleLabel = (role: UserRole) =>
    role === UserRole.HeadCoach ? 'Head Coach'
    : role === UserRole.Coach ? 'Coach'
    : 'Atleta';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-['Bebas_Neue'] text-3xl tracking-wide">Usuarios</h1>
          <p className="text-sm text-[var(--color-muted)]">{athletes?.length ?? 0} usuarios en tu organización</p>
        </div>
      </div>

      {!athletes?.length ? (
        <EmptyState icon={<Users size={40} />} title="Sin usuarios todavía"
          description="Los usuarios aparecerán aquí cuando inicien sesión con tu código de organización" />
      ) : (
        <div className="flex flex-col gap-3">
          {athletes.map(u => (
            <Card key={u.id} className="flex items-center gap-4">
              <Avatar src={u.avatarUrl} name={u.name} size={44} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{u.name}</p>
                  <Badge color={roleColor(u.role)}>{roleLabel(u.role)}</Badge>
                </div>
                <p className="text-sm text-[var(--color-muted)] truncate">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost"
                  onClick={() => navigate(`/calendar?athleteId=${u.id}`)}>
                  <Calendar size={14} /> Ver calendario
                </Button>
                <Button size="sm" variant="secondary"
                  onClick={() => { setRoleTarget(u); setNewRole(u.role); }}>
                  <Edit3 size={14} /> Rol
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!roleTarget} onClose={() => setRoleTarget(null)} title="Cambiar rol" size="sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[var(--color-muted)]">
            Cambiando rol de <strong>{roleTarget?.name}</strong>
          </p>
          <Select
            label="Nuevo rol"
            value={String(newRole)}
            onChange={e => setNewRole(Number(e.target.value) as UserRole)}
            options={[
              { value: String(UserRole.Athlete), label: 'Atleta' },
              { value: String(UserRole.Coach), label: 'Coach' },
              { value: String(UserRole.HeadCoach), label: 'Head Coach' },
            ]}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setRoleTarget(null)}>Cancelar</Button>
            <Button loading={changeRole.isPending}
              onClick={() => changeRole.mutate({ id: roleTarget!.id, role: newRole })}>
              Guardar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
