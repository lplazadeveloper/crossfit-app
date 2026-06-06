import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsApi, feedbackApi } from '../../api/services';
import { SessionStatus, WOD_PIECE_COLORS, FeedbackType, type WodPieceWithOverrideDto } from '../../types';
import { Card, Button, Badge, Avatar, Spinner, Textarea, Modal } from '../ui';
import { useAuthStore } from '../../store/authStore';
import { CheckCircle2, Clock, SkipForward, MessageSquare, Upload, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FeedbackSection } from '../feedback/FeedbackSection';
import { OverrideModal } from './OverrideModal';

export function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { isCoach } = useAuthStore();
  const [expandedPieces, setExpandedPieces] = useState<Set<string>>(new Set());
  const [overrideTarget, setOverrideTarget] = useState<WodPieceWithOverrideDto | null>(null);

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => sessionsApi.getDetail(id!),
    enabled: !!id,
  });

  const updateStatus = useMutation({
    mutationFn: ({ status, notes }: { status: SessionStatus; notes?: string }) =>
      sessionsApi.updateStatus(id!, status, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['session', id] }),
  });

  const togglePiece = (pieceId: string) =>
    setExpandedPieces(prev => {
      const next = new Set(prev);
      next.has(pieceId) ? next.delete(pieceId) : next.add(pieceId);
      return next;
    });

  if (isLoading || !session) return (
    <div className="flex items-center justify-center h-64"><Spinner size={32} /></div>
  );

  const date = format(new Date(session.scheduledDate), "EEEE d 'de' MMMM, yyyy", { locale: es });

  return (
    <div className="max-w-3xl mx-auto py-8 px-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-[var(--color-muted)] uppercase tracking-widest mb-1">{date}</p>
          <h1 className="font-['Bebas_Neue'] text-3xl tracking-wide">
            {session.programSession.title ?? 'Entrenamiento'}
          </h1>
          {session.programSession.notes && (
            <p className="text-sm text-[var(--color-muted)] mt-1">{session.programSession.notes}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {session.status === SessionStatus.Scheduled && (
            <>
              <Button size="sm" variant="secondary"
                onClick={() => updateStatus.mutate({ status: SessionStatus.Skipped })}>
                <SkipForward size={14} /> Saltar
              </Button>
              <Button size="sm"
                onClick={() => updateStatus.mutate({ status: SessionStatus.Completed })}>
                <CheckCircle2 size={14} /> Completar
              </Button>
            </>
          )}
          {session.status === SessionStatus.Completed && (
            <Badge color="#10B981">✓ Completado</Badge>
          )}
          {session.status === SessionStatus.Skipped && (
            <Badge color="#6B7280">Saltado</Badge>
          )}
        </div>
      </div>

      {/* WOD Pieces */}
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          Piezas del entrenamiento
        </h2>
        {session.wodPieces.map(({ base, override }) => {
          const color = WOD_PIECE_COLORS[base.type];
          const expanded = expandedPieces.has(base.id);
          const hasOverride = !!override;
          return (
            <Card key={base.id} padding="none" className="overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-surface2)] transition-colors"
                onClick={() => togglePiece(base.id)}>
                <span className="w-2 h-8 rounded-full flex-shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{base.title}</span>
                    <Badge color={color}>{base.type}</Badge>
                    {hasOverride && <Badge color="#F59E0B">Modificado</Badge>}
                    {base.timeCap && (
                      <span className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
                        <Clock size={11} /> {Math.floor(base.timeCap / 60)} min
                      </span>
                    )}
                  </div>
                </div>
                {isCoach() && (
                  <button onClick={e => { e.stopPropagation(); setOverrideTarget({ base, override }); }}
                    className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors">
                    <Edit3 size={14} />
                  </button>
                )}
                {expanded ? <ChevronUp size={16} className="text-[var(--color-muted)]" /> : <ChevronDown size={16} className="text-[var(--color-muted)]" />}
              </button>

              {expanded && (
                <div className="px-4 pb-4 flex flex-col gap-3 border-t border-[var(--color-border)]">
                  {/* Show override content if available, else base */}
                  {(override?.descriptionOverride ?? base.description) && (
                    <div className="mt-3">
                      {hasOverride && <p className="text-xs text-yellow-500 mb-1">⚡ Versión personalizada</p>}
                      <p className="text-sm whitespace-pre-wrap">{override?.descriptionOverride ?? base.description}</p>
                    </div>
                  )}
                  {(override?.scaledOverride ?? base.scaledDescription) && (
                    <div className="bg-[var(--color-surface2)] rounded-lg p-3">
                      <p className="text-xs text-[var(--color-muted)] mb-1">Escalado</p>
                      <p className="text-sm whitespace-pre-wrap">{override?.scaledOverride ?? base.scaledDescription}</p>
                    </div>
                  )}
                  {base.rxDescription && (
                    <div className="bg-[var(--color-surface2)] rounded-lg p-3">
                      <p className="text-xs text-[var(--color-muted)] mb-1">RX</p>
                      <p className="text-sm whitespace-pre-wrap">{base.rxDescription}</p>
                    </div>
                  )}
                  {(override?.coachNotes ?? base.coachNotes) && (
                    <div className="flex items-start gap-2 text-sm text-[var(--color-muted)]">
                      <MessageSquare size={14} className="mt-0.5 flex-shrink-0" />
                      <p className="italic">{override?.coachNotes ?? base.coachNotes}</p>
                    </div>
                  )}
                  {base.videoUrl && (
                    <a href={base.videoUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1">
                      ▶ Ver vídeo demostrativo
                    </a>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Feedback section */}
      <FeedbackSection sessionId={id!} feedbacks={session.feedbacks} />

      {/* Override modal */}
      {overrideTarget && (
        <OverrideModal
          open={true}
          onClose={() => setOverrideTarget(null)}
          piece={overrideTarget}
          sessionId={id!}
        />
      )}
    </div>
  );
}
