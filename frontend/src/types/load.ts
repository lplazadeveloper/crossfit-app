export enum MovementCategory {
  Squat = 'Squat', Hinge = 'Hinge', Push = 'Push', Pull = 'Pull',
  Olympic = 'Olympic', Carry = 'Carry', Core = 'Core',
  Gymnastics = 'Gymnastics', Endurance = 'Endurance',
  MetCon = 'MetCon', Skill = 'Skill',
}

export enum BlockType {
  Strength = 'Strength', Hypertrophy = 'Hypertrophy', Power = 'Power',
  Endurance = 'Endurance', Skill = 'Skill', Peak = 'Peak',
  Deload = 'Deload', Mixed = 'Mixed',
}

export interface BlockWeekDto {
  id: string; weekNumber: number; startDate: string;
  plannedIntensityFactor?: number; coachNotes?: string; isDeload: boolean;
}

export interface TrainingBlockDto {
  id: string; mesocycleId: string; type: BlockType; name: string;
  startDate: string; endDate: string; weekDuration: number;
  targetAvgRpe?: number; targetMinutesZ3Plus?: number; targetWeeklyVolumeTons?: number;
  weeks: BlockWeekDto[];
}

export interface MesocycleDto {
  id: string; name: string; description?: string;
  startDate: string; endDate: string; goalNotes?: string;
  blockCount: number; weekCount: number; blocks: TrainingBlockDto[];
}

export interface AthleteRMDto {
  id: string; athleteId: string; athleteName: string;
  movementName: string; category: MovementCategory;
  weightKg: number; reps: number; oneRmEstimated: number;
  testedAt: string; notes?: string;
}

export interface RMTableDto {
  movements: string[];
  athletes: Array<{
    athleteId: string; athleteName: string; athleteAvatar?: string;
    oneRmByMovement: Record<string, number | null>;
  }>;
}

export interface MovementVolumeDto {
  id: string; movementName: string; category: MovementCategory;
  sets: number; reps: number; weightKg?: number;
  percentRM?: number; tonnageKg?: number; relativeIntensity?: number;
}

export interface SessionLoadDto {
  id: string; athleteSessionId: string; sessionDate: string;
  sessionRpe?: number; durationMinutes?: number;
  minutesZ1?: number; minutesZ2?: number; minutesZ3?: number;
  minutesZ4?: number; minutesZ5?: number;
  loadScore?: number; movementVolumes: MovementVolumeDto[];
}

export interface WeeklyLoadDto {
  weekStart: string; totalLoadScore: number; totalMinutes: number;
  minutesZ3Plus: number; avgRpe: number; sessionCount: number;
  totalTonnageKg: number; acwrRatio?: number;
  acuteLoad7d?: number; chronicLoad28d?: number;
}

export interface IntensityDistributionDto {
  minutesZ1: number; minutesZ2: number; minutesZ3: number;
  minutesZ4: number; minutesZ5: number;
  percentZ1: number; percentZ2: number; percentZ3: number;
  percentZ4: number; percentZ5: number;
  totalMinutes: number;
}

export interface VolumeByWeekDto { weekStart: string; tonnageKg: number; avgRelativeIntensity: number; }

export interface MovementVolumeReportDto {
  movementName: string; category: MovementCategory;
  totalTonnageKg: number; totalSets: number; totalReps: number;
  avgRelativeIntensity: number; byWeek: VolumeByWeekDto[];
}

export interface AcwrChartDto {
  dates: string[]; acuteLoad: (number|null)[]; chronicLoad: (number|null)[];
  acwrRatio: (number|null)[]; athleteId: string; athleteName: string;
}

export interface AthleteDashboardDto {
  athleteId: string; athleteName: string; athleteAvatar?: string;
  weeklyLoads: WeeklyLoadDto[]; intensityDistribution: IntensityDistributionDto;
  movementVolumes: MovementVolumeReportDto[]; acwr: AcwrChartDto;
  lastWeekRpe?: number; trendLoadScore?: number;
}

export interface AthleteLoadSummaryDto {
  athleteId: string; athleteName: string; avatar?: string;
  lastWeekLoad?: number; acwrRatio?: number; avgRpe?: number;
  riskLevel: 'low' | 'moderate' | 'high';
}

export interface CoachOverviewDto {
  athletes: AthleteLoadSummaryDto[];
  orgIntensityDistribution: IntensityDistributionDto;
  orgAvgRpe: number; orgTotalTonnage: number;
}

// Zone colors
export const ZONE_COLORS = {
  Z1: '#6B7280', Z2: '#3B82F6', Z3: '#10B981', Z4: '#F59E0B', Z5: '#EF4444',
} as const;

export const ZONE_LABELS = {
  Z1: 'Z1 Recuperación', Z2: 'Z2 Aeróbico', Z3: 'Z3 Tempo',
  Z4: 'Z4 Umbral', Z5: 'Z5 Máximo',
} as const;

export const BLOCK_TYPE_COLORS: Record<BlockType, string> = {
  [BlockType.Strength]:    '#3B82F6',
  [BlockType.Hypertrophy]: '#8B5CF6',
  [BlockType.Power]:       '#F59E0B',
  [BlockType.Endurance]:   '#10B981',
  [BlockType.Skill]:       '#06B6D4',
  [BlockType.Peak]:        '#EF4444',
  [BlockType.Deload]:      '#6B7280',
  [BlockType.Mixed]:       '#EC4899',
};

export const RISK_COLORS = {
  low: '#10B981', moderate: '#F59E0B', high: '#EF4444',
} as const;
