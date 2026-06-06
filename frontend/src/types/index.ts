// ─── Enums ────────────────────────────────────────────────────────────────────
export enum UserRole {
  Athlete = 0,
  Coach = 1,
  HeadCoach = 2,
}

export enum WodPieceType {
  Warmup = 'Warmup',
  Strength = 'Strength',
  MetCon = 'MetCon',
  EMOM = 'EMOM',
  AMRAP = 'AMRAP',
  ForTime = 'ForTime',
  Skill = 'Skill',
  Cooldown = 'Cooldown',
  Gymnastics = 'Gymnastics',
  Endurance = 'Endurance',
  Custom = 'Custom',
}

export enum FeedbackType {
  Text = 'Text',
  Video = 'Video',
  Photo = 'Photo',
  File = 'File',
}

export enum SessionStatus {
  Scheduled = 'Scheduled',
  Completed = 'Completed',
  Skipped = 'Skipped',
}

export enum SubscriptionPlan {
  Starter = 'Starter',
  Pro = 'Pro',
  WhiteLabel = 'WhiteLabel',
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export interface UserDto {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  organizationId: string;
  organizationName: string;
}

export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  plan: SubscriptionPlan;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export interface ProgramDto {
  id: string;
  name: string;
  description?: string;
  isTemplate: boolean;
  sessionCount: number;
  athleteCount: number;
  createdAt: string;
}

export interface WodPieceDto {
  id: string;
  order: number;
  type: WodPieceType;
  title: string;
  description?: string;
  videoUrl?: string;
  timeCap?: number;
  rounds?: number;
  rxDescription?: string;
  scaledDescription?: string;
  coachNotes?: string;
}

export interface ProgramSessionDto {
  id: string;
  programId: string;
  dayOffset: number;
  title?: string;
  notes?: string;
  order: number;
  wodPieces: WodPieceDto[];
}

export interface AthleteOverrideDto {
  id: string;
  athleteId: string;
  descriptionOverride?: string;
  scaledOverride?: string;
  coachNotes?: string;
}

export interface WodPieceWithOverrideDto {
  base: WodPieceDto;
  override?: AthleteOverrideDto;
}

export interface FeedbackDto {
  id: string;
  type: FeedbackType;
  textContent?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  coachReply?: string;
  coachRepliedAt?: string;
  createdAt: string;
  user: UserDto;
}

export interface CalendarEntryDto {
  sessionId: string;
  athleteId: string;
  athleteName: string;
  athleteAvatar?: string;
  scheduledDate: string;
  sessionTitle?: string;
  status: SessionStatus;
  wodPieceCount: number;
  feedbackCount: number;
}

export interface AthleteSessionDetailDto {
  id: string;
  scheduledDate: string;
  status: SessionStatus;
  athleteNotes?: string;
  programSession: ProgramSessionDto;
  wodPieces: WodPieceWithOverrideDto[];
  feedbacks: FeedbackDto[];
}

// ─── Request types ────────────────────────────────────────────────────────────
export interface CreateProgramRequest {
  name: string;
  description?: string;
  isTemplate: boolean;
}

export interface CreateWodPieceRequest {
  order: number;
  type: WodPieceType;
  title: string;
  description?: string;
  videoUrl?: string;
  timeCap?: number;
  rounds?: number;
  rxDescription?: string;
  scaledDescription?: string;
  coachNotes?: string;
}

export interface AssignSessionRequest {
  programSessionId: string;
  athleteIds: string[];
  scheduledDate: string;
}

export interface UpdateBrandingRequest {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
export const WOD_PIECE_COLORS: Record<WodPieceType, string> = {
  [WodPieceType.Warmup]:    '#F59E0B',
  [WodPieceType.Strength]:  '#3B82F6',
  [WodPieceType.MetCon]:    '#EF4444',
  [WodPieceType.EMOM]:      '#8B5CF6',
  [WodPieceType.AMRAP]:     '#EC4899',
  [WodPieceType.ForTime]:   '#F97316',
  [WodPieceType.Skill]:     '#10B981',
  [WodPieceType.Cooldown]:  '#6B7280',
  [WodPieceType.Gymnastics]:'#06B6D4',
  [WodPieceType.Endurance]: '#84CC16',
  [WodPieceType.Custom]:    '#64748B',
};

export const STATUS_COLORS: Record<SessionStatus, string> = {
  [SessionStatus.Scheduled]: '#3B82F6',
  [SessionStatus.Completed]: '#10B981',
  [SessionStatus.Skipped]:   '#6B7280',
};
