using CrossFit.Core.DTOs;
using CrossFit.Core.Entities;
using CrossFit.Core.Enums;

namespace CrossFit.Core.Interfaces;

public interface IOrganizationRepository
{
    Task<Organization?> GetByIdAsync(Guid id);
    Task<Organization?> GetBySlugAsync(string slug);
    Task<Organization> CreateAsync(Organization org);
    Task<Organization> UpdateAsync(Organization org);

}

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id);
    Task<User?> GetByGoogleIdAsync(string googleId);
    Task<User?> GetByEmailAsync(string email, Guid organizationId);
    Task<List<User>> GetByOrganizationAsync(Guid organizationId, UserRole? role = null);
    Task<User> CreateAsync(User user);
    Task<User> UpdateAsync(User user);
    Task<List<User>> GetAthletesByCoachAsync(Guid coachId);
    Task<User?> GetByRefreshTokenAsync(string refreshToken);
}

public interface IProgramRepository
{
    Task<Program?> GetByIdAsync(Guid id, Guid organizationId);
    Task<List<Program>> GetByOrganizationAsync(Guid organizationId);
    Task<Program> CreateAsync(Program program);
    Task<Program> UpdateAsync(Program program);
    Task DeleteAsync(Guid id);
    Task<ProgramSession?> GetSessionByIdAsync(Guid sessionId);
    Task<ProgramSession> CreateSessionAsync(ProgramSession session);
    Task<ProgramSession> UpdateSessionAsync(ProgramSession session);
    Task DeleteSessionAsync(Guid sessionId);
    Task<WodPiece?> GetWodPieceByIdAsync(Guid pieceId);
    Task<WodPiece> CreateWodPieceAsync(WodPiece piece);
    Task<WodPiece> UpdateWodPieceAsync(WodPiece piece);
    Task DeleteWodPieceAsync(Guid pieceId);
}

public interface ISessionRepository
{
    Task<List<AthleteSession>> GetByAthleteAndRangeAsync(Guid athleteId, DateTime from, DateTime to);
    Task<List<AthleteSession>> GetByOrganizationAndRangeAsync(Guid organizationId, DateTime from, DateTime to);
    Task<AthleteSession?> GetDetailByIdAsync(Guid sessionId, Guid organizationId);
    Task<List<AthleteSession>> CreateBulkAsync(List<AthleteSession> sessions);
    Task<AthleteSession> UpdateAsync(AthleteSession session);
    Task<AthleteOverride?> GetOverrideAsync(Guid wodPieceId, Guid athleteId);
    Task<AthleteOverride> UpsertOverrideAsync(AthleteOverride override_);
}

public interface IFeedbackRepository
{
    Task<List<Feedback>> GetBySessionAsync(Guid sessionId);
    Task<Feedback?> GetByIdAsync(Guid id);
    Task<Feedback> CreateAsync(Feedback feedback);
    Task<Feedback> UpdateAsync(Feedback feedback);
    Task DeleteAsync(Guid id);
}

public interface IAuthService
{
    Task<AuthResponse> AuthenticateWithGoogleAsync(string idToken, string organizationSlug);
    Task<AuthResponse> RefreshTokenAsync(string refreshToken);
    Task RevokeTokenAsync(Guid userId);
}

public interface IMediaService
{
    Task<MediaUploadResponse> GenerateUploadUrlAsync(Guid sessionId, Guid userId, string fileName, string mimeType, long fileSize);
    Task DeleteMediaAsync(string mediaUrl);
    bool IsAllowedMimeType(string mimeType);
    bool IsWithinSizeLimit(long bytes, string mimeType);
}

public interface ICurrentUserService
{
    Guid UserId { get; }
    Guid OrganizationId { get; }
    UserRole Role { get; }
    bool IsHeadCoach => Role == UserRole.HeadCoach;
    bool IsCoach => Role >= UserRole.Coach;
}
