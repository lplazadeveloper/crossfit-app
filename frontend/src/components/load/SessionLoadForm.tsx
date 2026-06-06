import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { sessionLoadApi } from '../../api/loadServices';
import { MovementCategory } from '../../types/load';
import { Card, Button, Input, Select, Spinner } from '../ui';
import { Plus, Trash2, Activity, Clock, Zap, Dumbbell } from 'lucide-react';

interface Props { sessionId: string }

interface FormData {
  sessionRpe: number;
  durationMinutes: number;
  minutesZ1: number;
  minutesZ2: number;
  minutesZ3: number;
  minutesZ4: number;
  minutesZ5: number;
  movementVolumes: Array<{
    movementName: string;
    category: MovementCategory;
    sets: number;
    reps: number;
    weightKg: number;
    percentRM: number;
  }>;
}

export function SessionLoadForm({ sessionId }: Props) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['session-load', sessionId],
    queryFn: () => sessionLoadApi.get(sessionId),
  });

  const { register, handleSubmit, watch, control, setValue } = useForm<FormData>({
    defaultValues: {
      sessionRpe: existing?.sessionRpe ?? 7,
      durationMinutes: existing?.durationMinutes ?? 60,
      minutesZ1: existing?.minutesZ1 ?? 0,
      minutesZ2: existing?.minutesZ2 ?? 0,
      minutesZ3: existing?.minutesZ3 ?? 0,
      minutesZ4: existing?.minutesZ4 ?? 0,
      minutesZ5: existing?.minutesZ5 ?? 0,
      movementVolumes: existing?.movementVolumes?.map(v => ({
        movementName: v.movementName,
        category: v.category,
        sets: v.sets,
        reps: v.reps,
        weightKg: v.weightKg ?? 0,
        percentRM: v.percentRM ?? 0,
      })) ?? [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'movementVolumes' });

  const save = useMutation({
    mutationFn: (data: FormData) => sessionLoadApi.upsert(sessionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-load', sessionId] });
      setShowForm(false);
    },
  });

  const rpe = watch('sessionRpe');
  const dur = watch('durationMinutes');
  const loadScore = Math.round(rpe * dur);

  const minutesZ1 = watch('minutesZ1');
  const minutesZ2 = watch('minutesZ2');
  const minutesZ3 = watch('minutesZ3');
  const minutesZ4 = watch('minutesZ4');
  const minutesZ5 = watch('minutesZ5');
  const totalZones = Number(minutesZ1) + Number(minutesZ2) + Number(minutesZ3) + Number(minutesZ4) + Number(minutesZ5);

  if (isLoading) return <Spinner />;

  if (!showForm && existing) {
    return (
      <Card className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <span className="flex items-center gap-1.5 text-[var(--color-muted)]">
            <Activity size={14} /> RPE <strong className="text-[var(--color-text)]">{existing.sessionRpe?.toFixed(1)}</strong>
          </span>
          <span className="flex items-center gap-1.5 text-[var(--color-muted)]">
            <Clock size={14} /> <strong className="text-[var(--color-text)]">{existing.durationMinutes}min</strong>
          </span>
          <span className="flex items-center gap-1.5 text-[var(--color-muted)]">
            <Zap size={14} /> Score <strong className="text-[var(--color-primary)]">{existing.loadScore?.toFixed(0)}</strong>
          </span>
          <span className="flex items-center gap-1.5 text-[var(--color-muted)]">
            <Dumbbell size={14} /> {existing.movementVolumes.length} mov.
          </span>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setShowForm(true)}>Editar carga</Button>
      </Card>
    );
  }

  if (!showForm) {
    return (
      <button onClick={() => setShowForm(true)}
        className="w-full border border-dashed border-[var(--color-border)] rounded-xl py-4 text-sm text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors flex items-center justify-center gap-2">
        <Activity size={16} /> Registrar carga de sesión
      </button>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Registrar carga</h3>
        <button onClick={() => setShowForm(false)} className="text-[var(--color-muted)] hover:text-[var(--color-text)]">×</button>
      </div>
      <form onSubmit={handleSubmit(d => save.mutate(d))} className="flex flex-col gap-5">
        {/* RPE + duración */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--color-muted)]">RPE global (1-10)</label>
            <div className="flex items-center gap-2">
              <input type="range" min="1" max="10" step="0.5"
                {...register('sessionRpe', { valueAsNumber: true })}
                className="flex-1 accent-[var(--color-primary)]" />
              <span className="font-bold text-lg w-8 text-right tabular-nums" style={{
                color: rpe >= 9 ? '#EF4444' : rpe >= 7 ? '#F59E0B' : '#10B981'
              }}>{rpe}</span>
            </div>
          </div>
          <Input label="Duración (min)" type="number" {...register('durationMinutes', { valueAsNumber: true })} />
        </div>

        {/* Load score preview */}
        {loadScore > 0 && (
          <div className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 rounded-lg px-4 py-2 flex items-center justify-between">
            <span className="text-sm text-[var(--color-muted)]">Carga de sesión (RPE × min)</span>
            <span className="font-bold text-xl text-[var(--color-primary)] tabular-nums">{loadScore}</span>
          </div>
        )}

        {/* Zonas de FC */}
        <div>
          <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mb-2">
            Minutos por zona de FC {totalZones > 0 && <span className="ml-2 text-[var(--color-text)]">(total: {totalZones}min)</span>}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {([
              { label: 'Z1', key: 'minutesZ1', color: '#6B7280' },
              { label: 'Z2', key: 'minutesZ2', color: '#3B82F6' },
              { label: 'Z3', key: 'minutesZ3', color: '#10B981' },
              { label: 'Z4', key: 'minutesZ4', color: '#F59E0B' },
              { label: 'Z5', key: 'minutesZ5', color: '#EF4444' },
            ] as const).map(z => (
              <div key={z.key} className="flex flex-col gap-1 text-center">
                <label className="text-xs font-medium" style={{ color: z.color }}>{z.label}</label>
                <input type="number" min="0" {...register(z.key as any, { valueAsNumber: true })}
                  className="bg-[var(--color-surface2)] border rounded-lg px-2 py-1.5 text-center text-sm w-full focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ borderColor: z.color + '40', '--tw-ring-color': z.color + '60' } as any} />
              </div>
            ))}
          </div>
        </div>

        {/* Volúmenes de fuerza */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider">Volumen de fuerza</p>
            <Button size="sm" variant="ghost" type="button"
              onClick={() => append({ movementName: '', category: MovementCategory.Squat, sets: 3, reps: 5, weightKg: 0, percentRM: 0 })}>
              <Plus size={12} /> Añadir
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {fields.map((f, i) => (
              <div key={f.id} className="grid grid-cols-[1fr,auto,auto,auto,auto,auto,auto] gap-2 items-end">
                <Input placeholder="Movimiento" {...register(`movementVolumes.${i}.movementName` as const)} />
                <Select options={Object.values(MovementCategory).map(v => ({ value: v, label: v.slice(0, 4) }))}
                  {...register(`movementVolumes.${i}.category` as const)} />
                <Input placeholder="S" type="number" className="w-14" {...register(`movementVolumes.${i}.sets` as const, { valueAsNumber: true })} />
                <Input placeholder="R" type="number" className="w-14" {...register(`movementVolumes.${i}.reps` as const, { valueAsNumber: true })} />
                <Input placeholder="kg" type="number" step="0.5" className="w-20" {...register(`movementVolumes.${i}.weightKg` as const, { valueAsNumber: true })} />
                <Input placeholder="%RM" type="number" className="w-16" {...register(`movementVolumes.${i}.percentRM` as const, { valueAsNumber: true })} />
                <button type="button" onClick={() => remove(i)}
                  className="text-[var(--color-muted)] hover:text-red-400 transition-colors pb-2">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-[var(--color-border)]">
          <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
          <Button type="submit" loading={save.isPending}>Guardar carga</Button>
        </div>
      </form>
    </Card>
  );
}
