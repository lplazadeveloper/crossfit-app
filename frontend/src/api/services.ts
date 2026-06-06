import { api } from './client';
import type {
  AuthResponse, UserDto, OrganizationDto, UpdateBrandingRequest,
  ProgramDto, ProgramSessionDto, WodPieceDto, CreateProgramRequest,
  CreateWodPieceRequest, AssignSessionRequest, CalendarEntryDto,
  AthleteSessionDetailDto, AthleteOverrideDto, FeedbackDto, UserRole,
} from '../types';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  loginWithGoogle: (idToken: string) =>
    api.post<AuthResponse>('/auth/google', { idToken }).then(r => r.data),
  logout: () => api.post('/auth/logout'),
};

// ─── Organization ─────────────────────────────────────────────────────────────
export const orgApi = {
  get: () => api.get<OrganizationDto>('/organization').then(r => r.data),
  updateBranding: (data: UpdateBrandingRequest) =>
    api.put<OrganizationDto>('/organization/branding', data).then(r => r.data),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  me: () => api.get<UserDto>('/users/me').then(r => r.data),
  list: (role?: UserRole) =>
    api.get<UserDto[]>('/users', { params: { role } }).then(r => r.data),
  myAthletes: () => api.get<UserDto[]>('/users/athletes').then(r => r.data),
  changeRole: (id: string, role: UserRole) =>
    api.put<UserDto>(`/users/${id}/role`, role).then(r => r.data),
};

// ─── Programs ─────────────────────────────────────────────────────────────────
export const programsApi = {
  list: () => api.get<ProgramDto[]>('/programs').then(r => r.data),
  get: (id: string) => api.get<ProgramDto>(`/programs/${id}`).then(r => r.data),
  getSessions: (id: string) =>
    api.get<ProgramSessionDto[]>(`/programs/${id}/sessions`).then(r => r.data),
  create: (data: CreateProgramRequest) =>
    api.post<ProgramDto>('/programs', data).then(r => r.data),
  update: (id: string, data: Partial<CreateProgramRequest>) =>
    api.put<ProgramDto>(`/programs/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/programs/${id}`),
  createSession: (programId: string, data: object) =>
    api.post<ProgramSessionDto>(`/programs/${programId}/sessions`, data).then(r => r.data),
  createPiece: (sessionId: string, data: CreateWodPieceRequest) =>
    api.post<WodPieceDto>(`/programs/sessions/${sessionId}/pieces`, data).then(r => r.data),
  updatePiece: (pieceId: string, data: Partial<CreateWodPieceRequest>) =>
    api.put<WodPieceDto>(`/programs/pieces/${pieceId}`, data).then(r => r.data),
  deletePiece: (pieceId: string) => api.delete(`/programs/pieces/${pieceId}`),
};

// ─── Sessions / Calendar ──────────────────────────────────────────────────────
export const sessionsApi = {
  getCalendar: (from: Date, to: Date, athleteId?: string) =>
    api.get<CalendarEntryDto[]>('/sessions/calendar', {
      params: {
        from: from.toISOString(),
        to: to.toISOString(),
        athleteId,
      },
    }).then(r => r.data),
  getDetail: (id: string) =>
    api.get<AthleteSessionDetailDto>(`/sessions/${id}`).then(r => r.data),
  assign: (data: AssignSessionRequest) =>
    api.post('/sessions/assign', data).then(r => r.data),
  updateStatus: (id: string, status: string, notes?: string) =>
    api.put(`/sessions/${id}/status`, { status, notes }),
  upsertOverride: (pieceId: string, athleteId: string, data: object) =>
    api.put<AthleteOverrideDto>(
      `/sessions/pieces/${pieceId}/override`,
      data,
      { params: { athleteId } }
    ).then(r => r.data),
};

// ─── Feedback ─────────────────────────────────────────────────────────────────
export const feedbackApi = {
  list: (sessionId: string) =>
    api.get<FeedbackDto[]>(`/sessions/${sessionId}/feedback`).then(r => r.data),
  addText: (sessionId: string, textContent: string) =>
    api.post<FeedbackDto>(`/sessions/${sessionId}/feedback/text`, { textContent }).then(r => r.data),
  prepareUpload: (sessionId: string, fileName: string, mimeType: string, fileSize: number) =>
    api.post<{ uploadUrl: string; mediaUrl: string; feedbackId: string }>(
      `/sessions/${sessionId}/feedback/media/prepare`,
      null,
      { params: { fileName, mimeType, fileSize } }
    ).then(r => r.data),
  confirmUpload: (sessionId: string, data: object) =>
    api.post<FeedbackDto>(`/sessions/${sessionId}/feedback/media/confirm`, data).then(r => r.data),
  reply: (sessionId: string, feedbackId: string, reply: string) =>
    api.post<FeedbackDto>(`/sessions/${sessionId}/feedback/${feedbackId}/reply`, { reply }).then(r => r.data),
  delete: (sessionId: string, feedbackId: string) =>
    api.delete(`/sessions/${sessionId}/feedback/${feedbackId}`),
};
