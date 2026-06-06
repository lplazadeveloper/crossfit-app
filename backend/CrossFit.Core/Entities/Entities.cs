using CrossFit.Core.Enums;

namespace CrossFit.Core.Entities;

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsDeleted { get; set; } = false;
}

// ─── Organization (tenant) ───────────────────────────────────────────────────
public class Organization : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty; // e.g. "lpp-program"
    public string? LogoUrl { get; set; }
    public string PrimaryColor { get; set; } = "#E63946";
    public string SecondaryColor { get; set; } = "#1D3557";
    public string AccentColor { get; set; } = "#F1FAEE";
    public SubscriptionPlan Plan { get; set; } = SubscriptionPlan.Starter;
    public string? CustomDomain { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation
    public ICollection<User> Users { get; set; } = [];
    public ICollection<Program> Programs { get; set; } = [];
    public ICollection<WodTemplate> WodTemplates { get; set; } = [];
}

// ─── User ────────────────────────────────────────────────────────────────────
public class User : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public string GoogleId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public UserRole Role { get; set; } = UserRole.Athlete;
    public bool IsActive { get; set; } = true;
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiry { get; set; }

    // Navigation
    public Organization Organization { get; set; } = null!;
    public ICollection<AthleteSession> AthleteSessions { get; set; } = [];
    public ICollection<Feedback> Feedbacks { get; set; } = [];
    public ICollection<UserCoachAssignment> CoachAssignments { get; set; } = [];
}

// ─── Coach → Athlete assignment ──────────────────────────────────────────────
public class UserCoachAssignment : BaseEntity
{
    public Guid CoachId { get; set; }
    public Guid AthleteId { get; set; }
    public User Coach { get; set; } = null!;
    public User Athlete { get; set; } = null!;
}

// ─── Program (plantilla base reutilizable) ───────────────────────────────────
public class Program : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsTemplate { get; set; } = false; // true = plantilla genérica

    public Organization Organization { get; set; } = null!;
    public User CreatedBy { get; set; } = null!;
    public ICollection<ProgramSession> Sessions { get; set; } = [];
    public ICollection<AthleteProgram> AthletePrograms { get; set; } = [];
}

// ─── Athlete ↔ Program assignment ────────────────────────────────────────────
public class AthleteProgram : BaseEntity
{
    public Guid ProgramId { get; set; }
    public Guid AthleteId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    public Program Program { get; set; } = null!;
    public User Athlete { get; set; } = null!;
}

// ─── ProgramSession (día dentro del programa) ────────────────────────────────
public class ProgramSession : BaseEntity
{
    public Guid ProgramId { get; set; }
    public int DayOffset { get; set; } // 0=día 1, 1=día 2...
    public string? Title { get; set; }
    public string? Notes { get; set; }
    public int Order { get; set; }

    public Program Program { get; set; } = null!;
    public ICollection<WodPiece> WodPieces { get; set; } = [];
    public ICollection<AthleteSession> AthleteSessions { get; set; } = [];
}

// ─── WodPiece (pieza de entrenamiento dentro de una sesión) ──────────────────
public class WodPiece : BaseEntity
{
    public Guid ProgramSessionId { get; set; }
    public int Order { get; set; }
    public WodPieceType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? VideoUrl { get; set; }
    public int? TimeCap { get; set; } // segundos
    public int? Rounds { get; set; }
    public string? RxDescription { get; set; }
    public string? ScaledDescription { get; set; }
    public string? CoachNotes { get; set; }

    public ProgramSession ProgramSession { get; set; } = null!;
    public ICollection<AthleteOverride> AthleteOverrides { get; set; } = [];
}

// ─── WodTemplate (piezas reutilizables de la organización) ───────────────────
public class WodTemplate : BaseEntity
{
    public Guid OrganizationId { get; set; }
    public Guid CreatedByUserId { get; set; }
    public WodPieceType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? VideoUrl { get; set; }
    public string? RxDescription { get; set; }
    public string? ScaledDescription { get; set; }

    public Organization Organization { get; set; } = null!;
}

// ─── AthleteOverride (modificación individual de una pieza) ──────────────────
public class AthleteOverride : BaseEntity
{
    public Guid WodPieceId { get; set; }
    public Guid AthleteId { get; set; }
    public string? DescriptionOverride { get; set; }
    public string? ScaledOverride { get; set; }
    public string? CoachNotes { get; set; }

    public WodPiece WodPiece { get; set; } = null!;
    public User Athlete { get; set; } = null!;
}

// ─── AthleteSession (sesión concreta para un atleta en una fecha) ─────────────
public class AthleteSession : BaseEntity
{
    public Guid ProgramSessionId { get; set; }
    public Guid AthleteId { get; set; }
    public DateTime ScheduledDate { get; set; }
    public SessionStatus Status { get; set; } = SessionStatus.Scheduled;
    public string? AthleteNotes { get; set; }

    public ProgramSession ProgramSession { get; set; } = null!;
    public User Athlete { get; set; } = null!;
    public ICollection<Feedback> Feedbacks { get; set; } = [];
}

// ─── Feedback ────────────────────────────────────────────────────────────────
public class Feedback : BaseEntity
{
    public Guid AthleteSessionId { get; set; }
    public Guid UserId { get; set; }
    public FeedbackType Type { get; set; }
    public string? TextContent { get; set; }
    public string? MediaUrl { get; set; }
    public string? FileName { get; set; }
    public long? FileSizeBytes { get; set; }
    public string? MimeType { get; set; }
    public string? CoachReply { get; set; }
    public DateTime? CoachRepliedAt { get; set; }

    public AthleteSession AthleteSession { get; set; } = null!;
    public User User { get; set; } = null!;
}
