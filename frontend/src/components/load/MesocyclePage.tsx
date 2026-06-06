import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mesocyclesApi } from '../../api/loadServices';
import { BlockType, BLOCK_TYPE_COLORS, type MesocycleDto, type TrainingBlockDto } from '../../types/load';
import { Card, Button, Modal, Input, Select, Spinner, Textarea, EmptyState } from '../ui';
import { Plus, Trash2, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { format, differenceInWeeks } from 'date-fns';
import { es } from 'date-fns/locale';

export function MesocyclePage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState<string | null>(null); // mesocycleId
  const [expandedMeso, setExpandedMeso] = useState<string | null>(null);

  const { data: mesocycles, isLoading } = useQuery({
    queryKey: ['mesocycles'],
    queryFn: mesocyclesApi.list,
  });

  const createMeso = useMutation({
    mutationFn: mesocyclesApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mesocycles'] }); setCreateOpen(false); mesoForm.reset(); },
  });

  const deleteMeso = useMutation({
    mutationFn: mesocyclesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mesocycles'] }),
  });

  const createBlock = useMutation({
    mutationFn: ({ mesoId, data }: { mesoId: string; data: object }) =>
      mesocyclesApi.createBlock(mesoId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mesocycles'] }); setBlockOpen(null); blockForm.reset(); },
  });

  const mesoForm = useForm({ defaultValues: { name: '', description: '', startDate: '', endDate: '', goalNotes: '' } });
  const blockForm = useForm({
    defaultValues: { type: BlockType.Strength, name: '', startDate: '', weekDuration: 4, targetAvgRpe: 7, targetMinutesZ3Plus: 120, targetWeeklyVolumeTons: 5 },
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Bebas_Neue'] text-3xl tracking-wide">Planificación</h1>
          <p className="text-sm text-[var(--color-muted)]">Mesociclos y bloques de entrenamiento</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Nuevo mesociclo
        </Button>
      </div>

      {!mesocycles?.length ? (
        <EmptyState
          icon={<Calendar size={40} />}
          title="Sin mesociclos"
          description="Crea tu primer mesociclo para planificar bloques de entrenamiento con objetivos de carga"
          action={<Button onClick={() => setCreateOpen(true)}><Plus size={14} /> Crear mesociclo</Button>}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {mesocycles.map(meso => (
            <MesocycleCard
              key={meso.id}
              meso={meso}
              expanded={expandedMeso === meso.id}
              onToggle={() => setExpandedMeso(prev => prev === meso.id ? null : meso.id)}
              onAddBlock={() => { blockForm.setValue('startDate', meso.startDate.slice(0, 10)); setBlockOpen(meso.id); }}
              onDelete={() => { if (confirm('¿Eliminar mesociclo?')) deleteMeso.mutate(meso.id); }}
            />
          ))}
        </div>
      )}

      {/* Create mesocycle */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo mesociclo">
        <form onSubmit={mesoForm.handleSubmit(d => createMeso.mutate({
          ...d, startDate: new Date(d.startDate).toISOString(), endDate: new Date(d.endDate).toISOString(),
        }))} className="flex flex-col gap-4">
          <Input label="Nombre" placeholder="Ej: Bloque Fuerza Q1 2025" {...mesoForm.register('name', { required: true })} />
          <Textarea label="Descripción" placeholder="Objetivos del ciclo..." {...mesoForm.register('description')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Inicio" type="date" {...mesoForm.register('startDate', { required: true })} />
            <Input label="Fin" type="date" {...mesoForm.register('endDate', { required: true })} />
          </div>
          <Textarea label="Notas de objetivos" placeholder="Metas concretas a conseguir..." {...mesoForm.register('goalNotes')} />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={createMeso.isPending}>Crear</Button>
          </div>
        </form>
      </Modal>

      {/* Create block */}
      <Modal open={!!blockOpen} onClose={() => setBlockOpen(null)} title="Nuevo bloque de entrenamiento">
        <form onSubmit={blockForm.handleSubmit(d =>
          createBlock.mutate({ mesoId: blockOpen!, data: { ...d, startDate: new Date(d.startDate).toISOString() } })
        )} className="flex flex-col gap-4">
          <Select label="Tipo de bloque"
            options={Object.values(BlockType).map(v => ({ value: v, label: v }))}
            {...blockForm.register('type')} />
          <Input label="Nombre" placeholder="Ej: Semana de fuerza 1-4" {...blockForm.register('name', { required: true })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Inicio" type="date" {...blockForm.register('startDate', { required: true })} />
            <Input label="Semanas de duración" type="number" min="1" max="16" {...blockForm.register('weekDuration', { valueAsNumber: true })} />
          </div>
          <p className="text-xs text-[var(--color-muted)] font-medium uppercase tracking-wider">Targets de carga</p>
          <div className="grid grid-cols-3 gap-3">
            <Input label="RPE objetivo" type="number" step="0.5" min="1" max="10" {...blockForm.register('targetAvgRpe', { valueAsNumber: true })} />
            <Input label="Min Z3+ / sem" type="number" {...blockForm.register('targetMinutesZ3Plus', { valueAsNumber: true })} />
            <Input label="Tonelaje / sem (t)" type="number" step="0.5" {...blockForm.register('targetWeeklyVolumeTons', { valueAsNumber: true })} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setBlockOpen(null)}>Cancelar</Button>
            <Button type="submit" loading={createBlock.isPending}>Crear bloque</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function MesocycleCard({ meso, expanded, onToggle, onAddBlock, onDelete }: {
  meso: MesocycleDto;
  expanded: boolean;
  onToggle: () => void;
  onAddBlock: () => void;
  onDelete: () => void;
}) {
  const duration = differenceInWeeks(new Date(meso.endDate), new Date(meso.startDate));
  const now = new Date();
  const started = now >= new Date(meso.startDate);
  const ended = now > new Date(meso.endDate);
  const progress = ended ? 100 : started
    ? Math.round((now.getTime() - new Date(meso.startDate).getTime()) /
        (new Date(meso.endDate).getTime() - new Date(meso.startDate).getTime()) * 100)
    : 0;

  return (
    <Card padding="none">
      <button className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[var(--color-surface2)] transition-colors"
        onClick={onToggle}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-semibold">{meso.name}</h3>
            {ended && <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-surface2)] text-[var(--color-muted)]">Finalizado</span>}
            {started && !ended && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">En curso</span>}
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            {format(new Date(meso.startDate), "d MMM", { locale: es })} → {format(new Date(meso.endDate), "d MMM yyyy", { locale: es })} · {duration} semanas · {meso.blockCount} bloques
          </p>
          {/* Progress bar */}
          <div className="mt-2 h-1 bg-[var(--color-surface2)] rounded-full overflow-hidden w-48">
            <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 text-[var(--color-muted)] hover:text-red-400 transition-colors">
            <Trash2 size={14} />
          </button>
          {expanded ? <ChevronUp size={16} className="text-[var(--color-muted)]" /> : <ChevronDown size={16} className="text-[var(--color-muted)]" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-[var(--color-border)]">
          {meso.goalNotes && (
            <p className="text-sm text-[var(--color-muted)] italic mt-3 mb-4">"{meso.goalNotes}"</p>
          )}

          {/* Blocks timeline */}
          <div className="flex flex-col gap-2 mt-4">
            {meso.blocks.map(block => (
              <BlockRow key={block.id} block={block} />
            ))}
            {!meso.blocks.length && (
              <p className="text-sm text-[var(--color-muted)] py-3">Sin bloques todavía</p>
            )}
          </div>

          <Button size="sm" variant="secondary" className="mt-3" onClick={onAddBlock}>
            <Plus size={14} /> Añadir bloque
          </Button>
        </div>
      )}
    </Card>
  );
}

function BlockRow({ block }: { block: TrainingBlockDto }) {
  const color = BLOCK_TYPE_COLORS[block.type];
  const now = new Date();
  const isActive = now >= new Date(block.startDate) && now <= new Date(block.endDate);

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-1 rounded-full self-stretch min-h-[40px]" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{block.name}</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${color}22`, color }}>{block.type}</span>
          {isActive && <span className="text-xs text-green-400">● Activo</span>}
        </div>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">
          {format(new Date(block.startDate), "d MMM", { locale: es })} · {block.weekDuration} semanas
          {block.targetAvgRpe && ` · RPE objetivo: ${block.targetAvgRpe}`}
          {block.targetMinutesZ3Plus && ` · Z3+: ${block.targetMinutesZ3Plus}min/sem`}
        </p>
        {/* Weeks preview */}
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {block.weeks.map(w => (
            <span key={w.id}
              className="text-xs px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-muted)]"
              style={w.isDeload ? { background: '#6B728022', borderColor: '#6B7280', color: '#6B7280' } : {}}>
              S{w.weekNumber}{w.isDeload ? ' 🔋' : ''}
              {w.plannedIntensityFactor ? ` ${Math.round(w.plannedIntensityFactor * 100)}%` : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
