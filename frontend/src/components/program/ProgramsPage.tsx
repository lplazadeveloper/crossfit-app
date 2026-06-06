import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { programsApi } from '../../api/services';
import { WodPieceType, WOD_PIECE_COLORS, type ProgramDto, type CreateWodPieceRequest } from '../../types';
import { Card, Button, Modal, Input, Textarea, Select, Badge, Spinner, EmptyState } from '../ui';
import { Plus, Dumbbell, Users, Layers, Trash2, Edit3, GripVertical, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';

export function ProgramsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: programs, isLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: programsApi.list,
  });

  const createProgram = useMutation({
    mutationFn: programsApi.create,
    onSuccess: (p) => { qc.invalidateQueries({ queryKey: ['programs'] }); setCreateOpen(false); navigate(`/programs/${p.id}`); },
  });

  const deleteProgram = useMutation({
    mutationFn: (id: string) => programsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programs'] }),
  });

  const { register, handleSubmit, reset } = useForm({ defaultValues: { name: '', description: '', isTemplate: false } });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-['Bebas_Neue'] text-3xl tracking-wide">Programas</h1>
          <p className="text-sm text-[var(--color-muted)] mt-0.5">Crea y gestiona tus programas de entrenamiento</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Nuevo programa
        </Button>
      </div>

      {!programs?.length ? (
        <EmptyState
          icon={<Dumbbell size={40} />}
          title="Sin programas todavía"
          description="Crea tu primer programa para empezar a programar entrenamientos"
          action={<Button onClick={() => setCreateOpen(true)}><Plus size={14} /> Crear programa</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map(p => (
            <Card key={p.id} className="group cursor-pointer hover:border-[var(--color-primary)]/40 transition-all"
              onClick={() => navigate(`/programs/${p.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{p.name}</h3>
                    {p.isTemplate && <Badge color="#8B5CF6">Plantilla</Badge>}
                  </div>
                  {p.description && <p className="text-xs text-[var(--color-muted)] line-clamp-2">{p.description}</p>}
                </div>
                <button onClick={e => { e.stopPropagation(); if (confirm('¿Eliminar programa?')) deleteProgram.mutate(p.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-[var(--color-muted)] hover:text-red-400 transition-all ml-2">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--color-muted)]">
                <span className="flex items-center gap-1"><Layers size={12} /> {p.sessionCount} sesiones</span>
                <span className="flex items-center gap-1"><Users size={12} /> {p.athleteCount} atletas</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--color-border)]">
                <span className="text-xs text-[var(--color-muted)]">
                  {format(new Date(p.createdAt), 'd MMM yyyy')}
                </span>
                <ChevronRight size={14} className="text-[var(--color-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); reset(); }} title="Nuevo programa">
        <form onSubmit={handleSubmit(d => createProgram.mutate({ ...d, isTemplate: Boolean(d.isTemplate) }))}
          className="flex flex-col gap-4">
          <Input label="Nombre del programa" placeholder="Ej: LPP Week 1" {...register('name', { required: true })} />
          <Textarea label="Descripción (opcional)" placeholder="Objetivos, notas generales..." {...register('description')} />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register('isTemplate')} className="rounded" />
            <span>Marcar como plantilla reutilizable</span>
          </label>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={createProgram.isPending}>Crear programa</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Program Builder (sesiones y piezas) ─────────────────────────────────────
export function ProgramBuilder() {
  const { id } = { id: '' }; // Will use useParams in real route
  const qc = useQueryClient();
  const [addPieceSession, setAddPieceSession] = useState<string | null>(null);

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['program-sessions', id],
    queryFn: () => programsApi.getSessions(id),
    enabled: !!id,
  });

  const addSession = useMutation({
    mutationFn: (dayOffset: number) => programsApi.createSession(id, {
      dayOffset, title: `Día ${dayOffset + 1}`, order: dayOffset,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['program-sessions', id] }),
  });

  const addPiece = useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string; data: CreateWodPieceRequest }) =>
      programsApi.createPiece(sessionId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['program-sessions', id] }); setAddPieceSession(null); },
  });

  const pieceForm = useForm<CreateWodPieceRequest>({
    defaultValues: { order: 0, type: WodPieceType.MetCon, title: '' },
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>;

  return (
    <div className="flex flex-col gap-4 p-6">
      {sessions?.map(session => (
        <Card key={session.id}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{session.title ?? `Día ${session.dayOffset + 1}`}</h3>
            <Button size="sm" variant="secondary" onClick={() => setAddPieceSession(session.id)}>
              <Plus size={14} /> Añadir pieza
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {session.wodPieces.map(piece => (
              <div key={piece.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface2)]">
                <GripVertical size={14} className="text-[var(--color-muted)] cursor-grab" />
                <span className="w-1.5 h-6 rounded-full" style={{ background: WOD_PIECE_COLORS[piece.type] }} />
                <span className="text-sm font-medium flex-1">{piece.title}</span>
                <Badge color={WOD_PIECE_COLORS[piece.type]}>{piece.type}</Badge>
              </div>
            ))}
            {!session.wodPieces.length && (
              <p className="text-sm text-center text-[var(--color-muted)] py-4">Sin piezas. Añade la primera.</p>
            )}
          </div>
        </Card>
      ))}

      <Button variant="secondary" onClick={() => addSession.mutate(sessions?.length ?? 0)}>
        <Plus size={16} /> Añadir día
      </Button>

      {/* Add piece modal */}
      <Modal open={!!addPieceSession} onClose={() => setAddPieceSession(null)} title="Nueva pieza de entrenamiento">
        <form onSubmit={pieceForm.handleSubmit(data =>
          addPiece.mutate({ sessionId: addPieceSession!, data })
        )} className="flex flex-col gap-4">
          <Input label="Nombre" placeholder="Ej: Back Squat 5x5" {...pieceForm.register('title', { required: true })} />
          <Select label="Tipo" options={Object.values(WodPieceType).map(v => ({ value: v, label: v }))}
            {...pieceForm.register('type')} />
          <Textarea label="Descripción" placeholder="Descripción del WOD..." {...pieceForm.register('description')} />
          <Textarea label="RX" placeholder="Cargas, estándares RX..." {...pieceForm.register('rxDescription')} />
          <Textarea label="Escalado" placeholder="Opciones de escalado..." {...pieceForm.register('scaledDescription')} />
          <Textarea label="Notas del coach" placeholder="Notas internas..." {...pieceForm.register('coachNotes')} />
          <div className="flex gap-3">
            <Input label="Tiempo límite (min)" type="number" className="flex-1"
              onChange={e => pieceForm.setValue('timeCap', parseInt(e.target.value) * 60)} />
            <Input label="Rondas" type="number" className="flex-1" {...pieceForm.register('rounds', { valueAsNumber: true })} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={() => setAddPieceSession(null)}>Cancelar</Button>
            <Button type="submit" loading={addPiece.isPending}>Añadir pieza</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
