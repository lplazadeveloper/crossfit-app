import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { feedbackApi } from '../../api/services';
import { FeedbackType, type FeedbackDto } from '../../types';
import { Card, Button, Avatar, Textarea, Badge } from '../ui';
import { useAuthStore } from '../../store/authStore';
import { MessageSquare, Upload, Video, Image, File, Send, CornerDownRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { sessionId: string; feedbacks: FeedbackDto[] }

export function FeedbackSection({ sessionId, feedbacks }: Props) {
  const { user, isCoach } = useAuthStore();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [uploading, setUploading] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['session', sessionId] });

  const addText = useMutation({
    mutationFn: () => feedbackApi.addText(sessionId, text),
    onSuccess: () => { setText(''); invalidate(); },
  });

  const addReply = useMutation({
    mutationFn: (feedbackId: string) => feedbackApi.reply(sessionId, feedbackId, replyText),
    onSuccess: () => { setReplyId(null); setReplyText(''); invalidate(); },
  });

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const { uploadUrl, mediaUrl } = await feedbackApi.prepareUpload(
        sessionId, file.name, file.type, file.size
      );
      // Upload directly to R2/S3
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      // Confirm
      await feedbackApi.confirmUpload(sessionId, {
        mediaUrl, fileName: file.name, fileSizeBytes: file.size, mimeType: file.type
      });
      invalidate();
    } finally {
      setUploading(false);
    }
  }, [sessionId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files.forEach(uploadFile),
    accept: {
      'video/*': ['.mp4', '.mov', '.webm'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 500 * 1024 * 1024,
  });

  const feedbackIcon = (type: FeedbackType) => ({
    [FeedbackType.Text]: <MessageSquare size={14} />,
    [FeedbackType.Video]: <Video size={14} />,
    [FeedbackType.Photo]: <Image size={14} />,
    [FeedbackType.File]: <File size={14} />,
  })[type];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        Feedback ({feedbacks.length})
      </h2>

      {/* Input area */}
      <Card>
        <Textarea
          placeholder="Escribe tu feedback, resultados, cómo te has sentido..."
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
        />
        <div className="flex items-center gap-2 mt-3">
          <div {...getRootProps()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed text-sm cursor-pointer transition-colors ${isDragActive ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}>
            <input {...getInputProps()} />
            <Upload size={14} />
            {uploading ? 'Subiendo...' : 'Adjuntar'}
          </div>
          <Button size="sm" className="ml-auto" loading={addText.isPending}
            disabled={!text.trim()} onClick={() => addText.mutate()}>
            <Send size={14} /> Enviar
          </Button>
        </div>
      </Card>

      {/* Feedback list */}
      {feedbacks.length === 0 ? (
        <p className="text-sm text-center text-[var(--color-muted)] py-6">
          Aún no hay feedback para esta sesión
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {feedbacks.map(fb => (
            <Card key={fb.id} className="group">
              <div className="flex items-start gap-3">
                <Avatar src={fb.user.avatarUrl} name={fb.user.name} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium">{fb.user.name}</span>
                    <Badge>{feedbackIcon(fb.type)} {fb.type}</Badge>
                    <span className="text-xs text-[var(--color-muted)] ml-auto">
                      {formatDistanceToNow(new Date(fb.createdAt), { addSuffix: true, locale: es })}
                    </span>
                  </div>

                  {fb.textContent && <p className="text-sm whitespace-pre-wrap">{fb.textContent}</p>}

                  {fb.mediaUrl && fb.type === FeedbackType.Photo && (
                    <img src={fb.mediaUrl} alt={fb.fileName ?? ''} className="mt-2 rounded-lg max-h-60 object-cover" />
                  )}
                  {fb.mediaUrl && fb.type === FeedbackType.Video && (
                    <video src={fb.mediaUrl} controls className="mt-2 rounded-lg max-h-60 w-full" />
                  )}
                  {fb.mediaUrl && fb.type === FeedbackType.File && (
                    <a href={fb.mediaUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-2 flex items-center gap-2 text-xs text-[var(--color-primary)] hover:underline">
                      <File size={12} /> {fb.fileName}
                    </a>
                  )}

                  {/* Coach reply */}
                  {fb.coachReply && (
                    <div className="mt-2 pl-3 border-l-2 border-[var(--color-primary)] text-sm text-[var(--color-muted)] italic">
                      <span className="text-[var(--color-primary)] not-italic font-medium">Coach: </span>
                      {fb.coachReply}
                    </div>
                  )}

                  {/* Reply input */}
                  {isCoach() && replyId === fb.id && (
                    <div className="mt-2 flex gap-2">
                      <Textarea rows={2} placeholder="Responder..." value={replyText}
                        onChange={e => setReplyText(e.target.value)} />
                      <div className="flex flex-col gap-1">
                        <Button size="sm" loading={addReply.isPending}
                          onClick={() => addReply.mutate(fb.id)}>
                          <Send size={12} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setReplyId(null)}>✕</Button>
                      </div>
                    </div>
                  )}

                  {isCoach() && !fb.coachReply && replyId !== fb.id && (
                    <button onClick={() => setReplyId(fb.id)}
                      className="mt-1 flex items-center gap-1 text-xs text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors opacity-0 group-hover:opacity-100">
                      <CornerDownRight size={12} /> Responder
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
