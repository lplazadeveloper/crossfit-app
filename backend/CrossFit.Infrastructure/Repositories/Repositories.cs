using CrossFit.Core.Entities;
using CrossFit.Core.Enums;
using CrossFit.Core.Interfaces;
using CrossFit.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CrossFit.Infrastructure.Repositories;

// ─── Organization ─────────────────────────────────────────────────────────────
public class OrganizationRepository(AppDbContext db) : IOrganizationRepository
{
    public Task<Organization?> GetByIdAsync(Guid id) =>
        db.Organizations.FirstOrDefaultAsync(x => x.Id == id);

    public Task<Organization?> GetBySlugAsync(string slug) =>
        db.Organizations.FirstOrDefaultAsync(x => x.Slug == slug);

    public async Task<Organization> CreateAsync(Organization org)
    {
        db.Organizations.Add(org);
        await db.SaveChangesAsync();
        return org;
    }

    public async Task<Organization> UpdateAsync(Organization org)
    {
        db.Organizations.Update(org);
        await db.SaveChangesAsync();
        return org;
    }
}

// ─── User ─────────────────────────────────────────────────────────────────────
public class UserRepository(AppDbContext db) : IUserRepository
{
    public Task<User?> GetByIdAsync(Guid id) =>
        db.Users.Include(u => u.Organization).FirstOrDefaultAsync(u => u.Id == id);

    public Task<User?> GetByGoogleIdAsync(string googleId) =>
        db.Users.Include(u => u.Organization).FirstOrDefaultAsync(u => u.GoogleId == googleId);

    public Task<User?> GetByEmailAsync(string email, Guid organizationId) =>
        db.Users.Include(u => u.Organization)
                .FirstOrDefaultAsync(u => u.Email == email && u.OrganizationId == organizationId);

    public Task<List<User>> GetByOrganizationAsync(Guid organizationId, UserRole? role = null)
    {
        var q = db.Users.Where(u => u.OrganizationId == organizationId);
        if (role.HasValue) q = q.Where(u => u.Role == role.Value);
        return q.OrderBy(u => u.Name).ToListAsync();
    }

    public Task<List<User>> GetAthletesByCoachAsync(Guid coachId) =>
        db.CoachAssignments
          .Where(a => a.CoachId == coachId)
          .Select(a => a.Athlete)
          .OrderBy(u => u.Name)
          .ToListAsync();

    public async Task<User> CreateAsync(User user)
    {
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public async Task<User> UpdateAsync(User user)
    {
        db.Users.Update(user);
        await db.SaveChangesAsync();
        return user;
    }
}

// ─── Program ──────────────────────────────────────────────────────────────────
public class ProgramRepository(AppDbContext db) : IProgramRepository
{
    public Task<Program?> GetByIdAsync(Guid id, Guid organizationId) =>
        db.Programs
          .Include(p => p.Sessions.OrderBy(s => s.Order))
              .ThenInclude(s => s.WodPieces.OrderBy(w => w.Order))
          .Include(p => p.AthletePrograms)
          .FirstOrDefaultAsync(p => p.Id == id && p.OrganizationId == organizationId);

    public Task<List<Program>> GetByOrganizationAsync(Guid organizationId) =>
        db.Programs
          .Where(p => p.OrganizationId == organizationId)
          .Include(p => p.Sessions)
          .Include(p => p.AthletePrograms)
          .OrderByDescending(p => p.CreatedAt)
          .ToListAsync();

    public async Task<Program> CreateAsync(Program program)
    {
        db.Programs.Add(program);
        await db.SaveChangesAsync();
        return program;
    }

    public async Task<Program> UpdateAsync(Program program)
    {
        db.Programs.Update(program);
        await db.SaveChangesAsync();
        return program;
    }

    public async Task DeleteAsync(Guid id)
    {
        var p = await db.Programs.FindAsync(id);
        if (p != null) { p.IsDeleted = true; await db.SaveChangesAsync(); }
    }

    public Task<ProgramSession?> GetSessionByIdAsync(Guid sessionId) =>
        db.ProgramSessions
          .Include(s => s.WodPieces.OrderBy(w => w.Order))
          .FirstOrDefaultAsync(s => s.Id == sessionId);

    public async Task<ProgramSession> CreateSessionAsync(ProgramSession session)
    {
        db.ProgramSessions.Add(session);
        await db.SaveChangesAsync();
        return session;
    }

    public async Task<ProgramSession> UpdateSessionAsync(ProgramSession session)
    {
        db.ProgramSessions.Update(session);
        await db.SaveChangesAsync();
        return session;
    }

    public async Task DeleteSessionAsync(Guid sessionId)
    {
        var s = await db.ProgramSessions.FindAsync(sessionId);
        if (s != null) { s.IsDeleted = true; await db.SaveChangesAsync(); }
    }

    public Task<WodPiece?> GetWodPieceByIdAsync(Guid pieceId) =>
        db.WodPieces.FindAsync(pieceId).AsTask();

    public async Task<WodPiece> CreateWodPieceAsync(WodPiece piece)
    {
        db.WodPieces.Add(piece);
        await db.SaveChangesAsync();
        return piece;
    }

    public async Task<WodPiece> UpdateWodPieceAsync(WodPiece piece)
    {
        db.WodPieces.Update(piece);
        await db.SaveChangesAsync();
        return piece;
    }

    public async Task DeleteWodPieceAsync(Guid pieceId)
    {
        var w = await db.WodPieces.FindAsync(pieceId);
        if (w != null) { w.IsDeleted = true; await db.SaveChangesAsync(); }
    }
}

// ─── Session ──────────────────────────────────────────────────────────────────
public class SessionRepository(AppDbContext db) : ISessionRepository
{
    public Task<List<AthleteSession>> GetByAthleteAndRangeAsync(Guid athleteId, DateTime from, DateTime to) =>
        db.AthleteSessions
          .Include(s => s.ProgramSession)
              .ThenInclude(ps => ps.WodPieces)
          .Include(s => s.Feedbacks)
          .Where(s => s.AthleteId == athleteId && s.ScheduledDate >= from && s.ScheduledDate <= to)
          .OrderBy(s => s.ScheduledDate)
          .ToListAsync();

    public Task<List<AthleteSession>> GetByOrganizationAndRangeAsync(Guid organizationId, DateTime from, DateTime to) =>
        db.AthleteSessions
          .Include(s => s.Athlete)
          .Include(s => s.ProgramSession)
              .ThenInclude(ps => ps.WodPieces)
          .Include(s => s.Feedbacks)
          .Where(s => s.Athlete.OrganizationId == organizationId
                   && s.ScheduledDate >= from && s.ScheduledDate <= to)
          .OrderBy(s => s.ScheduledDate)
          .ThenBy(s => s.Athlete.Name)
          .ToListAsync();

    public Task<AthleteSession?> GetDetailByIdAsync(Guid sessionId, Guid organizationId) =>
        db.AthleteSessions
          .Include(s => s.Athlete)
          .Include(s => s.ProgramSession)
              .ThenInclude(ps => ps.WodPieces)
                  .ThenInclude(w => w.AthleteOverrides)
          .Include(s => s.Feedbacks)
              .ThenInclude(f => f.User)
          .FirstOrDefaultAsync(s => s.Id == sessionId && s.Athlete.OrganizationId == organizationId);

    public async Task<List<AthleteSession>> CreateBulkAsync(List<AthleteSession> sessions)
    {
        db.AthleteSessions.AddRange(sessions);
        await db.SaveChangesAsync();
        return sessions;
    }

    public async Task<AthleteSession> UpdateAsync(AthleteSession session)
    {
        db.AthleteSessions.Update(session);
        await db.SaveChangesAsync();
        return session;
    }

    public Task<AthleteOverride?> GetOverrideAsync(Guid wodPieceId, Guid athleteId) =>
        db.AthleteOverrides.FirstOrDefaultAsync(o => o.WodPieceId == wodPieceId && o.AthleteId == athleteId);

    public async Task<AthleteOverride> UpsertOverrideAsync(AthleteOverride ov)
    {
        var existing = await GetOverrideAsync(ov.WodPieceId, ov.AthleteId);
        if (existing == null)
        {
            db.AthleteOverrides.Add(ov);
        }
        else
        {
            existing.DescriptionOverride = ov.DescriptionOverride;
            existing.ScaledOverride = ov.ScaledOverride;
            existing.CoachNotes = ov.CoachNotes;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
        return existing ?? ov;
    }
}

// ─── Feedback ─────────────────────────────────────────────────────────────────
public class FeedbackRepository(AppDbContext db) : IFeedbackRepository
{
    public Task<List<Feedback>> GetBySessionAsync(Guid sessionId) =>
        db.Feedbacks
          .Include(f => f.User)
          .Where(f => f.AthleteSessionId == sessionId)
          .OrderByDescending(f => f.CreatedAt)
          .ToListAsync();

    public Task<Feedback?> GetByIdAsync(Guid id) =>
        db.Feedbacks.Include(f => f.User).FirstOrDefaultAsync(f => f.Id == id);

    public async Task<Feedback> CreateAsync(Feedback feedback)
    {
        db.Feedbacks.Add(feedback);
        await db.SaveChangesAsync();
        return feedback;
    }

    public async Task<Feedback> UpdateAsync(Feedback feedback)
    {
        db.Feedbacks.Update(feedback);
        await db.SaveChangesAsync();
        return feedback;
    }

    public async Task DeleteAsync(Guid id)
    {
        var f = await db.Feedbacks.FindAsync(id);
        if (f != null) { f.IsDeleted = true; await db.SaveChangesAsync(); }
    }
}
