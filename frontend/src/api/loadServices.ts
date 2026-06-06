import { api } from './client';
import type {
  MesocycleDto, TrainingBlockDto, AthleteRMDto, RMTableDto,
  SessionLoadDto, AthleteDashboardDto, CoachOverviewDto,
  AcwrChartDto, IntensityDistributionDto, MovementVolumeReportDto,
} from '../types/load';

export const mesocyclesApi = {
  list: () => api.get<MesocycleDto[]>('/mesocycles').then(r => r.data),
  get: (id: string) => api.get<MesocycleDto>(`/mesocycles/${id}`).then(r => r.data),
  create: (data: object) => api.post<MesocycleDto>('/mesocycles', data).then(r => r.data),
  delete: (id: string) => api.delete(`/mesocycles/${id}`),
  createBlock: (mesocycleId: string, data: object) =>
    api.post<TrainingBlockDto>(`/mesocycles/${mesocycleId}/blocks`, data).then(r => r.data),
};

export const rmsApi = {
  getTable: (movements?: string[]) =>
    api.get<RMTableDto>('/rms/table', { params: { movements } }).then(r => r.data),
  getForAthlete: (athleteId: string) =>
    api.get<AthleteRMDto[]>(`/rms/athlete/${athleteId}`).then(r => r.data),
  upsert: (data: object) => api.post<AthleteRMDto>('/rms', data).then(r => r.data),
  delete: (id: string) => api.delete(`/rms/${id}`),
};

export const sessionLoadApi = {
  get: (sessionId: string) =>
    api.get<SessionLoadDto>(`/sessions/${sessionId}/load`).then(r => r.data),
  upsert: (sessionId: string, data: object) =>
    api.put<SessionLoadDto>(`/sessions/${sessionId}/load`, data).then(r => r.data),
};

export const analyticsApi = {
  getAthleteDashboard: (athleteId: string, from?: Date, to?: Date) =>
    api.get<AthleteDashboardDto>(`/analytics/athlete/${athleteId}`, {
      params: { from: from?.toISOString(), to: to?.toISOString() },
    }).then(r => r.data),

  getMyDashboard: (from?: Date, to?: Date) =>
    api.get<AthleteDashboardDto>('/analytics/me', {
      params: { from: from?.toISOString(), to: to?.toISOString() },
    }).then(r => r.data),

  getCoachOverview: (from?: Date, to?: Date) =>
    api.get<CoachOverviewDto>('/analytics/overview', {
      params: { from: from?.toISOString(), to: to?.toISOString() },
    }).then(r => r.data),

  getAcwr: (athleteId: string, from?: Date, to?: Date) =>
    api.get<AcwrChartDto>(`/analytics/acwr/${athleteId}`, {
      params: { from: from?.toISOString(), to: to?.toISOString() },
    }).then(r => r.data),

  getIntensity: (athleteId: string, from?: Date, to?: Date) =>
    api.get<IntensityDistributionDto>(`/analytics/intensity/${athleteId}`, {
      params: { from: from?.toISOString(), to: to?.toISOString() },
    }).then(r => r.data),

  getVolumes: (athleteId: string, from?: Date, to?: Date) =>
    api.get<MovementVolumeReportDto[]>(`/analytics/volumes/${athleteId}`, {
      params: { from: from?.toISOString(), to: to?.toISOString() },
    }).then(r => r.data),
};
