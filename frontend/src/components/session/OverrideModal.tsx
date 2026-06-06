import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsApi } from '../../api/services';
import { Modal, Button, Textarea } from '../ui';
import type { WodPieceWithOverrideDto } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  piece: WodPieceWithOverrideDto;
  sessionId: string;
  athleteId?: string;
}

interface FormData {
  descriptionOverride: string;
  scaledOverride: string;
  coachNotes: string;
}

export function OverrideModal({ open, onClose, piece, sessionId, athleteId }: Props) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm<FormData>({
    defaultValues: {
      descriptionOverride: piece.override?.descriptionOverride ?? piece.base.description ?? '',
      scaledOverride: piece.override?.scaledOverride ?? piece.base.scaledDescription ?? '',
      coachNotes: piece.override?.coachNotes ?? piece.base.coachNotes ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      sessionsApi.upsertOverride(piece.base.id, athleteId ?? '', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session', sessionId] });
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={`Personalizar: ${piece.base.title}`} size="md">
      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="flex flex-col gap-4">
        <Textarea
          label="Descripción personalizada"
          placeholder="Deja vacío para usar la descripción base"
          {...register('descriptionOverride')}
        />
        <Textarea
          label="Escalado personalizado"
          placeholder="Deja vacío para usar el escalado base"
          {...register('scaledOverride')}
        />
        <Textarea
          label="Notas del coach (privadas)"
          placeholder="Solo visible para el coach"
          {...register('coachNotes')}
        />
        <div className="flex gap-2 justify-end pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={mutation.isPending}>Guardar override</Button>
        </div>
      </form>
    </Modal>
  );
}
