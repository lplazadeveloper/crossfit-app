using CrossFit.Core.Entities.Load;

namespace CrossFit.Core.DTOs.Load;

// ─── Mesociclo ────────────────────────────────────────────────────────────────
public record MesocycleDto(
    Guid Id,
    string Name,
    string? Description,
    DateTime StartDate,
    DateTime EndDate,
    string? GoalNotes,
    int BlockCount,
    int WeekCount,
    List<TrainingBlockDto> Blocks
);

public record CreateMesocycleRequest(
    string Name,
    string? Description,
    DateTime StartDate,
    DateTime EndDate,
    string? GoalNotes
);

// ─── Bloque ───────────────────────────────────────────────────────────────────
public record TrainingBlockDto(
    Guid Id,
    Guid MesocycleId,
    BlockType Type,
    string Name,
    DateTime StartDate,
    DateTime EndDate,
    int WeekDuration,
    double? TargetAvgRpe,
    double? TargetMinutesZ3Plus,
    double? TargetWeeklyVolumeTons,
    List<BlockWeekDto> Weeks
);

public record CreateTrainingBlockRequest(
    Guid MesocycleId,
    BlockType Type,
    string Name,
    DateTime StartDate,
    int WeekDuration,
    double? TargetAvgRpe,
    double? TargetMinutesZ3Plus,
    double? TargetWeeklyVolumeTons
);

public record BlockWeekDto(
    Guid Id,
    int WeekNumber,
    DateTime StartDate,
    double? PlannedIntensityFactor,
    string? CoachNotes,
    bool IsDeload
);

// ─── RMs ──────────────────────────────────────────────────────────────────────
public record AthleteRMDto(
    Guid Id,
    Guid AthleteId,
    string AthleteName,
    string MovementName,
    MovementCategory Category,
    double WeightKg,
    int Reps,
    double OneRmEstimated,
    DateTime TestedAt,
    string? Notes
);

public record UpsertAthleteRMRequest(
    Guid AthleteId,
    string MovementName,
    MovementCategory Category,
    double WeightKg,
    int Reps,
    DateTime TestedAt,
    string? Notes
);

// Tabla de RMs (todos los atletas × todos los movimientos)
public record RMTableDto(
    List<string> Movements,
    List<RMRowDto> Athletes
);

public record RMRowDto(
    Guid AthleteId,
    string AthleteName,
    string? AthleteAvatar,
    Dictionary<string, double?> OneRmByMovement   // movimiento → 1RM estimado
);

// ─── SessionLoad ──────────────────────────────────────────────────────────────
public record SessionLoadDto(
    Guid Id,
    Guid AthleteSessionId,
    DateTime SessionDate,
    double? SessionRpe,
    int? DurationMinutes,
    int? MinutesZ1,
    int? MinutesZ2,
    int? MinutesZ3,
    int? MinutesZ4,
    int? MinutesZ5,
    double? LoadScore,
    List<MovementVolumeDto> MovementVolumes
);

public record UpsertSessionLoadRequest(
    double? SessionRpe,
    int? DurationMinutes,
    int? MinutesZ1,
    int? MinutesZ2,
    int? MinutesZ3,
    int? MinutesZ4,
    int? MinutesZ5,
    List<UpsertMovementVolumeRequest> MovementVolumes
);

public record MovementVolumeDto(
    Guid Id,
    string MovementName,
    MovementCategory Category,
    int Sets,
    int Reps,
    double? WeightKg,
    double? PercentRM,
    double? TonnageKg,
    double? RelativeIntensity
);

public record UpsertMovementVolumeRequest(
    string MovementName,
    MovementCategory Category,
    int Sets,
    int Reps,
    double? WeightKg,
    double? PercentRM
);

// ─── Analytics / Dashboard ────────────────────────────────────────────────────
public record WeeklyLoadDto(
    DateTime WeekStart,
    double TotalLoadScore,
    int TotalMinutes,
    int MinutesZ3Plus,
    double AvgRpe,
    int SessionCount,
    double TotalTonnageKg,
    double? AcwrRatio,
    double? AcuteLoad7d,
    double? ChronicLoad28d
);

public record AcwrChartDto(
    List<DateTime> Dates,
    List<double?> AcuteLoad,     // 7-day rolling
    List<double?> ChronicLoad,   // 28-day rolling
    List<double?> AcwrRatio,
    string AthleteId,
    string AthleteName
);

public record IntensityDistributionDto(
    int MinutesZ1,
    int MinutesZ2,
    int MinutesZ3,
    int MinutesZ4,
    int MinutesZ5,
    double PercentZ1,
    double PercentZ2,
    double PercentZ3,
    double PercentZ4,
    double PercentZ5,
    int TotalMinutes
);

public record MovementVolumeReportDto(
    string MovementName,
    MovementCategory Category,
    double TotalTonnageKg,
    int TotalSets,
    int TotalReps,
    double AvgRelativeIntensity,
    List<VolumeByWeekDto> ByWeek
);

public record VolumeByWeekDto(DateTime WeekStart, double TonnageKg, double AvgRelativeIntensity);

public record AthleteDashboardDto(
    string AthleteId,
    string AthleteName,
    string? AthleteAvatar,
    List<WeeklyLoadDto> WeeklyLoads,
    IntensityDistributionDto IntensityDistribution,
    List<MovementVolumeReportDto> MovementVolumes,
    AcwrChartDto Acwr,
    double? LastWeekRpe,
    double? TrendLoadScore       // % cambio vs semana anterior
);

public record CoachOverviewDto(
    List<AthleteLoadSummaryDto> Athletes,
    IntensityDistributionDto OrgIntensityDistribution,
    double OrgAvgRpe,
    double OrgTotalTonnage
);

public record AthleteLoadSummaryDto(
    string AthleteId,
    string AthleteName,
    string? Avatar,
    double? LastWeekLoad,
    double? AcwrRatio,
    double? AvgRpe,
    string RiskLevel   // "low" | "moderate" | "high"
);
