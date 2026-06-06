import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rmsApi } from '../../api/loadServices';
import { usersApi } from '../../api/services';
import { MovementCategory, type AthleteRMDto } from '../../types/load';
import { Card, Button, Modal, Input, Select, Spinner, Avatar } from '../ui';
import { Plus, Edit3, Trash2, Calculator } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function RMTablePage() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<string | null>(null);

  const { data: rmTable, isLoading } = useQuery({
    queryKey: ['rm-table'],
    queryFn: () => rmsApi.getTable(),
  });

  const { data: athletes } = useQuery({
    queryKey: ['athletes-list'],
    queryFn: usersApi.list,
  });

  const addRM = useMutation({
    mutationFn: rmsApi.upsert,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rm-table'] }); setAddOpen(false); },
  });

  const deleteRM = useMutation({
    mutationFn: rmsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rm-table'] }),
  });

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: {
      athleteId: '', movementName: '', category: MovementCategory.Squat,
      weightKg: 0, reps: 1,
      testedAt: format(new Date(), 'yyyy-MM-dd'), notes: '',
    },
  });

  const weightKg = watch('weightKg');
  const reps = watch('reps');
  const estimated1rm = reps === 1 ? weightKg : Math.round(weightKg * (1 + reps / 30) * 10) / 10;

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Bebas_Neue'] text-3xl tracking-wide">Tabla de RMs</h1>
          <p className="text-sm text-[var(--color-muted)]">
            1RM estimados de todos los atletas. {rmTable?.movements.length ?? 0} movimientos registrados.
          </p>
        </div>
        <Button onClick={() => { reset(); setAddOpen(true); }}>
          <Plus size={16} /> Registrar RM
        </Button>
      </div>

      {/* RM spreadsheet table */}
      {!rmTable?.movements.length ? (
        <Card className="text-center py-12">
          <Calculator size={40} className="mx-auto mb-3 text-[var(--color-muted)]" />
          <p className="font-medium mb-1">Sin RMs registrados</p>
          <p className="text-sm text-[var(--color-muted)] mb-4">Empieza registrando el 1RM de tus atletas</p>
          <Button onClick={() => setAddOpen(true)}><Plus size={14} /> Primer RM</Button>
        </Card>
      ) : (
        <Card padding="none" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-surface2)]">
                <th className="text-left py-3 px-4 font-medium text-[var(--color-muted)] text-xs uppercase tracking-wider sticky left-0 bg-[var(--color-surface2)] min-w-[160px]">
                  Atleta
                </th>
                {rmTable.movements.map(m => (
                  <th key={m} className="text-center py-3 px-3 font-medium text-[var(--color-muted)] text-xs uppercase tracking-wider whitespace-nowrap min-w-[100px]">
                    {m}
                  </th>
                ))}
                <th className="py-3 px-4 w-10" />
              </tr>
            </thead>
            <tbody>
              {rmTable.athletes.map(row => (
                <tr key={row.athleteId}
                  className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface2)]/50 transition-colors">
                  <td className="py-3 px-4 sticky left-0 bg-[var(--color-surface)]">
                    <div className="flex items-center gap-2">
                      <Avatar src={row.athleteAvatar} name={row.athleteName} size={28} />
                      <span className="font-medium whitespace-nowrap">{row.athleteName}</span>
                    </div>
                  </td>
                  {rmTable.movements.map(m => {
                    const val = row.oneRmByMovement[m];
                    return (
                      <td key={m} className="text-center py-3 px-3">
                        {val != null ? (
                          <button
                            onClick={() => { setValue('athleteId', row.athleteId); setValue('movementName', m); setAddOpen(true); }}
                            className="group relative font-semibold tabular-nums hover:text-[var(--color-primary)] transition-colors">
                            {val.toFixed(1)}<span className="text-[var(--color-muted)] font-normal text-xs">kg</span>
                            <span className="absolute -top-0.5 -right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Edit3 size={10} />
                            </span>
                          </button>
                        ) : (
                          <button
                            onClick={() => { setValue('athleteId', row.athleteId); setValue('movementName', m); setAddOpen(true); }}
                            className="text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors text-xs">
                            + add
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-3 px-4">
                    <button onClick={() => setSelectedAthlete(row.athleteId)}
                      className="text-xs text-[var(--color-muted)] hover:text-[var(--color-primary)] whitespace-nowrap">
                      Historial
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* RM history for selected athlete */}
      {selectedAthlete && (
        <AthleteRMHistory
          athleteId={selectedAthlete}
          athleteName={athletes?.find(a => a.id === selectedAthlete)?.name ?? ''}
          onClose={() => setSelectedAthlete(null)}
          onDelete={(id) => deleteRM.mutate(id)}
        />
      )}

      {/* Add RM modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Registrar RM" size="sm">
        <form onSubmit={handleSubmit(d => addRM.mutate({
          ...d, weightKg: Number(d.weightKg), reps: Number(d.reps),
          testedAt: new Date(d.testedAt).toISOString(),
        }))} className="flex flex-col gap-4">
          <Select label="Atleta" options={
            athletes?.filter(a => a.role === 0).map(a => ({ value: a.id, label: a.name })) ?? []
          } {...register('athleteId', { required: true })} />
          <Input label="Movimiento" placeholder="Back Squat, Clean, Snatch..." {...register('movementName', { required: true })} />
          <Select label="Categoría" options={Object.values(MovementCategory).map(v => ({ value: v, label: v }))}
            {...register('category')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Peso (kg)" type="number" step="0.5" {...register('weightKg', { required: true, valueAsNumber: true })} />
            <Input label="Repeticiones" type="number" min="1" max="10" {...register('reps', { required: true, valueAsNumber: true })} />
          </div>
          {estimated1rm > 0 && (
            <div className="bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 rounded-lg px-4 py-2 flex items-center justify-between">
              <span className="text-sm text-[var(--color-muted)]">1RM estimado (Epley)</span>
              <span className="font-bold text-lg text-[var(--color-primary)]">{estimated1rm.toFixed(1)} kg</span>
            </div>
          )}
          <Input label="Fecha de test" type="date" {...register('testedAt', { required: true })} />
          <Input label="Notas (opcional)" placeholder="Condiciones, técnica..." {...register('notes')} />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={addRM.isPending}>Guardar RM</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function AthleteRMHistory({ athleteId, athleteName, onClose, onDelete }: {
  athleteId: string; athleteName: string; onClose: () => void; onDelete: (id: string) => void;
}) {
  const { data: rms, isLoading } = useQuery({
    queryKey: ['athlete-rms', athleteId],
    queryFn: () => rmsApi.getForAthlete(athleteId),
  });

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Historial de RMs — {athleteName}</h2>
        <button onClick={onClose} className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-xl">×</button>
      </div>
      {isLoading ? <Spinner /> : (
        <div className="flex flex-col gap-2">
          {rms?.map(rm => (
            <div key={rm.id} className="flex items-center gap-3 py-2 border-b border-[var(--color-border)]">
              <div className="flex-1">
                <span className="font-medium">{rm.movementName}</span>
                <span className="text-[var(--color-muted)] text-sm ml-2">{rm.reps}RM</span>
              </div>
              <div className="text-right">
                <div className="font-bold tabular-nums">{rm.weightKg}kg</div>
                <div className="text-xs text-[var(--color-muted)]">
                  1RM est. {rm.oneRmEstimated.toFixed(1)}kg
                </div>
              </div>
              <div className="text-xs text-[var(--color-muted)] w-20 text-right">
                {format(new Date(rm.testedAt), 'd MMM yy', { locale: es })}
              </div>
              <button onClick={() => { if (confirm('¿Eliminar?')) onDelete(rm.id); }}
                className="text-[var(--color-muted)] hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!rms?.length && <p className="text-center text-sm text-[var(--color-muted)] py-4">Sin RMs registrados</p>}
        </div>
      )}
    </Card>
  );
}
