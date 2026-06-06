using CrossFit.Core.Enums;

namespace CrossFit.Core.DTOs;

// ─── Auth ────────────────────────────────────────────────────────────────────
public record GoogleAuthRequest(string IdToken);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    UserDto User
);

public record RefreshTokenRequest(string RefreshToken);

// ─── User ────────────────────────────────────────────────────────────────────
public record UserDto(
    Guid Id,
    string Name,
    string Email,
    string? AvatarUrl,
    UserRole Role,
    Guid OrganizationId,
    string OrganizationName
);

public record UpdateUserRequest(string? Name, string? AvatarUrl);

// ─── Organization ────────────────────────────────────────────────────────────
public record OrganizationDto(
    Guid Id,
    string Name,
    string Slug,
    string? LogoUrl,
    string PrimaryColor,
    string SecondaryColor,
    string AccentColor,
    SubscriptionPlan Plan
);

public record UpdateBrandingRequest(
    string? PrimaryColor,
    string? SecondaryColor,
    string? AccentColor,
    string? LogoUrl
);

// ─── Program ─────────────────────────────────────────────────────────────────
public record ProgramDto(
    Guid Id,
    string Name,
    string? Description,
    bool IsTemplate,
    int SessionCount,
    int AthleteCount,
    DateTime CreatedAt
);

public record CreateProgramRequest(
    string Name,
    string? Description,
    bool IsTemplate
);

public record UpdateProgramRequest(
    string? Name,
    string? Description
);

// ─── ProgramSession ───────────────────────────────────────────────────────────
public record ProgramSessionDto(
    Guid Id,
    Guid ProgramId,
    int DayOffset,
    string? Title,
    string? Notes,
    int Order,
    List<WodPieceDto> WodPieces
);

public record CreateProgramSessionRequest(
    int DayOffset,
    string? Title,
    string? Notes,
    int Order
);

// ─── WodPiece ────────────────────────────────────────────────────────────────
public record WodPieceDto(
    Guid Id,
    int Order,
    WodPieceType Type,
    string Title,
    string? Description,
    string? VideoUrl,
    int? TimeCap,
    int? Rounds,
    string? RxDescription,
    string? ScaledDescription,
    string? CoachNotes
);

public record CreateWodPieceRequest(
    int Order,
    WodPieceType Type,
    string Title,
    string? Description,
    string? VideoUrl,
    int? TimeCap,
    int? Rounds,
    string? RxDescription,
    string? ScaledDescription,
    string? CoachNotes
);

public record UpdateWodPieceRequest(
    int? Order,
    string? Title,
    string? Description,
    string? VideoUrl,
    int? TimeCap,
    int? Rounds,
    string? RxDescription,
    string? ScaledDescription,
    string? CoachNotes
);

// ─── AthleteSession / Calendar ────────────────────────────────────────────────
public record CalendarEntryDto(
    Guid SessionId,
    Guid AthleteId,
    string AthleteName,
    string? AthleteAvatar,
    DateTime ScheduledDate,
    string? SessionTitle,
    SessionStatus Status,
    int WodPieceCount,
    int FeedbackCount
);

public record AthleteSessionDetailDto(
    Guid Id,
    DateTime ScheduledDate,
    SessionStatus Status,
    string? AthleteNotes,
    ProgramSessionDto ProgramSession,
    List<WodPieceWithOverrideDto> WodPieces,
    List<FeedbackDto> Feedbacks
);

public record WodPieceWithOverrideDto(
    WodPieceDto Base,
    AthleteOverrideDto? Override
);

public record AssignSessionRequest(
    Guid ProgramSessionId,
    List<Guid> AthleteIds,
    DateTime ScheduledDate
);

public record UpdateSessionStatusRequest(SessionStatus Status, string? Notes);

// ─── AthleteOverride ─────────────────────────────────────────────────────────
public record AthleteOverrideDto(
    Guid Id,
    Guid AthleteId,
    string? DescriptionOverride,
    string? ScaledOverride,
    string? CoachNotes
);

public record UpsertAthleteOverrideRequest(
    string? DescriptionOverride,
    string? ScaledOverride,
    string? CoachNotes
);

// ─── Feedback ────────────────────────────────────────────────────────────────
public record FeedbackDto(
    Guid Id,
    FeedbackType Type,
    string? TextContent,
    string? MediaUrl,
    string? FileName,
    long? FileSizeBytes,
    string? CoachReply,
    DateTime? CoachRepliedAt,
    DateTime CreatedAt,
    UserDto User
);

public record CreateTextFeedbackRequest(string TextContent);
public record CoachReplyRequest(string Reply);

// ─── Media upload ─────────────────────────────────────────────────────────────
public record MediaUploadResponse(
    string UploadUrl,   // presigned URL para subir directo a R2/S3
    string MediaUrl,    // URL pública final
    string FeedbackId
);

// ─── Athlete assignment ───────────────────────────────────────────────────────
public record AssignAthleteToProgramRequest(
    Guid AthleteId,
    Guid ProgramId,
    DateTime StartDate,
    DateTime? EndDate
);

// ─── Pagination ───────────────────────────────────────────────────────────────
public record PagedResult<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize
);
