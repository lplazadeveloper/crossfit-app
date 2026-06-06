using CrossFit.Core.Enums;

namespace CrossFit.Core.Entities.Load;

// ─── Intensidad / Zonas de FC ────────────────────────────────────────────────
public enum IntensityZone
{
    Z1_Recovery   = 1,  // <60% FC max  — recuperación activa
    Z2_Aerobic    = 2,  // 60-70%       — base aeróbica
    Z3_Tempo      = 3,  // 70-80%       — umbral aeróbico
    Z4_Threshold  = 4,  // 80-90%       — umbral anaeróbico
    Z5_MaxEffort  = 5,  // >90%         — potencia máxima
}

public enum MovementCategory
{
    Squat,
    Hinge,          // deadlift, KB swing...
    Push,           // press, push-up, dips
    Pull,           // pull-up, row, ring muscle-up
    Olympic,        // clean, snatch, jerk
    Carry,
    Core,
    Gymnastics,
    Endurance,
    MetCon,
    Skill,
}

public enum BlockType
{
    Strength,
    Hypertrophy,
    Power,
    Endurance,
    Skill,
    Peak,
    Deload,
    Mixed,
}

// ─── Mesociclo ────────────────────────────────────────────────────────────────
public class Mesocycle : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string Name { get; set; } = string.Empty;      // "Bloque Fuerza Q1 2025"
    public string? Description { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? GoalNotes { get; set; }

    public Organization Organization { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
    public ICollection<TrainingBlock> Blocks { get; set; } = [];
}

// ─── Bloque de entrenamiento (dentro de un mesociclo) ────────────────────────
public class TrainingBlock : BaseEntity
{
    public Guid MesocycleId { get; set; }
    public BlockType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int WeekDuration { get; set; }

    // Targets de planificación
    public double? TargetAvgRpe { get; set; }
    public double? TargetMinutesZ3Plus { get; set; }   // min/semana en Z3+
    public double? TargetWeeklyVolumeTons { get; set; } // toneladas objetivo

    public Mesocycle Mesocycle { get; set; } = null!;
    public ICollection<BlockWeek> Weeks { get; set; } = [];
}

// ─── Semana dentro de un bloque ───────────────────────────────────────────────
public class BlockWeek : BaseEntity
{
    public Guid BlockId { get; set; }
    public int WeekNumber { get; set; }           // 1, 2, 3...
    public DateTime StartDate { get; set; }
    public double? PlannedIntensityFactor { get; set; }  // 0.6 – 1.0 (% carga relativa)
    public string? CoachNotes { get; set; }
    public bool IsDeload { get; set; } = false;

    public TrainingBlock Block { get; set; } = null!;
}

// ─── RM del atleta por movimiento ─────────────────────────────────────────────
public class AthleteRM : BaseEntity
{
    public Guid AthleteId { get; set; }
    public Guid OrganizationId { get; set; }
    public string MovementName { get; set; } = string.Empty;  // "Back Squat", "Clean"...
    public MovementCategory Category { get; set; }
    public double WeightKg { get; set; }
    public int Reps { get; set; } = 1;             // 1RM, 3RM, 5RM...
    public double OneRmEstimated { get; set; }     // calculado con Epley
    public DateTime TestedAt { get; set; }
    public string? Notes { get; set; }

    public User Athlete { get; set; } = null!;

    // Epley formula: 1RM = weight × (1 + reps/30)
    public static double EstimateOneRM(double weight, int reps) =>
        reps == 1 ? weight : weight * (1 + reps / 30.0);
}

// ─── Métricas de carga de una sesión (rellenadas post-WOD) ───────────────────
public class SessionLoad : BaseEntity
{
    public Guid AthleteSessionId { get; set; }
    public Guid AthleteId { get; set; }
    public Guid OrganizationId { get; set; }
    public DateTime SessionDate { get; set; }

    // RPE global de la sesión (1–10)
    public double? SessionRpe { get; set; }

    // Duración total en minutos
    public int? DurationMinutes { get; set; }

    // Zonas de FC en minutos
    public int? MinutesZ1 { get; set; }
    public int? MinutesZ2 { get; set; }
    public int? MinutesZ3 { get; set; }
    public int? MinutesZ4 { get; set; }
    public int? MinutesZ5 { get; set; }

    // Carga calculada: SessionLoad = RPE × DurationMinutes (Foster method)
    public double? LoadScore { get; set; }

    // Volumen de fuerza
    public ICollection<MovementVolume> MovementVolumes { get; set; } = [];

    public AthleteSession AthleteSession { get; set; } = null!;
    public User Athlete { get; set; } = null!;

    // Helpers
    public int TotalMinutesZ3Plus => (MinutesZ3 ?? 0) + (MinutesZ4 ?? 0) + (MinutesZ5 ?? 0);
    public int TotalMinutesTracked => (MinutesZ1 ?? 0) + (MinutesZ2 ?? 0) + TotalMinutesZ3Plus;

    public void RecalculateLoad()
    {
        if (SessionRpe.HasValue && DurationMinutes.HasValue)
            LoadScore = SessionRpe.Value * DurationMinutes.Value;
    }
}

// ─── Volumen por movimiento en una sesión ────────────────────────────────────
public class MovementVolume : BaseEntity
{
    public Guid SessionLoadId { get; set; }
    public Guid AthleteId { get; set; }
    public string MovementName { get; set; } = string.Empty;
    public MovementCategory Category { get; set; }

    public int Sets { get; set; }
    public int Reps { get; set; }          // reps por serie (o total si es distinto)
    public double? WeightKg { get; set; }
    public double? PercentRM { get; set; } // % del RM actual

    // Tonelaje = sets × reps × weightKg
    public double? TonnageKg => Sets * Reps * (WeightKg ?? 0);

    // IMR = Intensidad Media Relativa = weightKg / 1RM
    public double? RelativeIntensity { get; set; }

    public SessionLoad SessionLoad { get; set; } = null!;
    public User Athlete { get; set; } = null!;
}

// ─── Snapshot semanal de carga (pre-calculado para performance) ───────────────
public class WeeklyLoadSnapshot : BaseEntity
{
    public Guid AthleteId { get; set; }
    public Guid OrganizationId { get; set; }
    public DateTime WeekStart { get; set; }           // Lunes de la semana

    public double TotalLoadScore { get; set; }        // Σ SessionLoad scores
    public int TotalMinutes { get; set; }
    public int MinutesZ3Plus { get; set; }
    public double AvgRpe { get; set; }
    public int SessionCount { get; set; }
    public double TotalTonnageKg { get; set; }
    public int CompletedSessions { get; set; }
    public int SkippedSessions { get; set; }

    // Acwr = Acute:Chronic Workload Ratio (calculado en servicio)
    public double? AcuteLoad7d { get; set; }
    public double? ChronicLoad28d { get; set; }
    public double? AcwrRatio { get; set; }            // <0.8 subentrenado, >1.3 riesgo

    public User Athlete { get; set; } = null!;
}
