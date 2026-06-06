using CrossFit.Core.DTOs;
using CrossFit.Core.Entities;
using CrossFit.Core.Enums;
using CrossFit.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CrossFit.API.Controllers;

// ─── Base ─────────────────────────────────────────────────────────────────────
[ApiController]
[Route("api/[controller]")]
public abstract class BaseController : ControllerBase
{
    protected static UserDto MapUser(User u) => new(
        u.Id, u.Name, u.Email, u.AvatarUrl, u.Role,
        u.OrganizationId, u.Organization?.Name ?? string.Empty);

    protected static WodPieceDto MapWodPiece(WodPiece w) => new(
        w.Id, w.Order, w.Type, w.Title, w.Description, w.VideoUrl,
        w.TimeCap, w.Rounds, w.RxDescription, w.ScaledDescription, w.CoachNotes);

    protected static FeedbackDto MapFeedback(Feedback f) => new(
        f.Id, f.Type, f.TextContent, f.MediaUrl, f.FileName,
        f.FileSizeBytes, f.CoachReply, f.CoachRepliedAt, f.CreatedAt, MapUser(f.User));
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
[Route("api/auth")]
public class AuthController(IAuthService auth) : BaseController
{
    [HttpPost("google")]
    public async Task<AuthResponse> GoogleLogin([FromBody] GoogleAuthRequest req,
        [FromHeader(Name = "X-Organization")] string orgSlug)
        => await auth.AuthenticateWithGoogleAsync(req.IdToken, orgSlug);

    [HttpPost("refresh")]
    public async Task<AuthResponse> Refresh([FromBody] RefreshTokenRequest req)
        => await auth.RefreshTokenAsync(req.RefreshToken);

    [HttpPost("logout"), Authorize]
    public async Task<IActionResult> Logout([FromServices] ICurrentUserService cu)
    {
        await auth.RevokeTokenAsync(cu.UserId);
        return Ok();
    }
}

// ─── Organization ─────────────────────────────────────────────────────────────
[Route("api/organization"), Authorize]
public class OrganizationController(
    IOrganizationRepository orgRepo,
    ICurrentUserService cu) : BaseController
{
    [HttpGet]
    public async Task<OrganizationDto> Get()
    {
        var org = await orgRepo.GetByIdAsync(cu.OrganizationId)
            ?? throw new KeyNotFoundException("Organization not found");
        return new(org.Id, org.Name, org.Slug, org.LogoUrl,
            org.PrimaryColor, org.SecondaryColor, org.AccentColor, org.Plan);
    }

    [HttpPut("branding"), Authorize(Policy = "HeadCoachOnly")]
    public async Task<OrganizationDto> UpdateBranding([FromBody] UpdateBrandingRequest req)
    {
        var org = await orgRepo.GetByIdAsync(cu.OrganizationId)
            ?? throw new KeyNotFoundException("Organization not found");
        if (req.PrimaryColor != null) org.PrimaryColor = req.PrimaryColor;
        if (req.SecondaryColor != null) org.SecondaryColor = req.SecondaryColor;
        if (req.AccentColor != null) org.AccentColor = req.AccentColor;
        if (req.LogoUrl != null) org.LogoUrl = req.LogoUrl;
        await orgRepo.UpdateAsync(org);
        return new(org.Id, org.Name, org.Slug, org.LogoUrl,
            org.PrimaryColor, org.SecondaryColor, org.AccentColor, org.Plan);
    }
}

// ─── Users ────────────────────────────────────────────────────────────────────
[Route("api/users"), Authorize]
public class UsersController(IUserRepository userRepo, ICurrentUserService cu) : BaseController
{
    [HttpGet("me")]
    public async Task<UserDto> Me()
    {
        var user = await userRepo.GetByIdAsync(cu.UserId)
            ?? throw new KeyNotFoundException("User not found");
        return MapUser(user);
    }

    [HttpGet, Authorize(Policy = "CoachOrAbove")]
    public async Task<List<UserDto>> List([FromQuery] UserRole? role)
        => (await userRepo.GetByOrganizationAsync(cu.OrganizationId, role)).Select(MapUser).ToList();

    [HttpGet("athletes"), Authorize(Policy = "CoachOrAbove")]
    public async Task<List<UserDto>> MyAthletes()
        => (await userRepo.GetAthletesByCoachAsync(cu.UserId)).Select(MapUser).ToList();

    [HttpPut("{id:guid}/role"), Authorize(Policy = "HeadCoachOnly")]
    public async Task<UserDto> ChangeRole(Guid id, [FromBody] UserRole newRole)
    {
        var user = await userRepo.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("User not found");
        if (user.OrganizationId != cu.OrganizationId) throw new UnauthorizedAccessException();
        user.Role = newRole;
        await userRepo.UpdateAsync(user);
        return MapUser(user);
    }
}

// ─── Programs ─────────────────────────────────────────────────────────────────
[Route("api/programs"), Authorize]
public class ProgramsController(
    IProgramRepository programRepo,
    ICurrentUserService cu) : BaseController
{
    [HttpGet]
    public async Task<List<ProgramDto>> List()
    {
        var programs = await programRepo.GetByOrganizationAsync(cu.OrganizationId);
        return programs.Select(p => new ProgramDto(
            p.Id, p.Name, p.Description, p.IsTemplate,
            p.Sessions.Count, p.AthletePrograms.Count, p.CreatedAt)).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<ProgramDto> Get(Guid id)
    {
        var p = await programRepo.GetByIdAsync(id, cu.OrganizationId)
            ?? throw new KeyNotFoundException("Program not found");
        return new(p.Id, p.Name, p.Description, p.IsTemplate,
            p.Sessions.Count, p.AthletePrograms.Count, p.CreatedAt);
    }

    [HttpGet("{id:guid}/sessions")]
    public async Task<List<ProgramSessionDto>> GetSessions(Guid id)
    {
        var p = await programRepo.GetByIdAsync(id, cu.OrganizationId)
            ?? throw new KeyNotFoundException("Program not found");
        return p.Sessions.OrderBy(s => s.Order).Select(s => new ProgramSessionDto(
            s.Id, s.ProgramId, s.DayOffset, s.Title, s.Notes, s.Order,
            s.WodPieces.OrderBy(w => w.Order).Select(MapWodPiece).ToList()
        )).ToList();
    }

    [HttpPost, Authorize(Policy = "CoachOrAbove")]
    public async Task<ProgramDto> Create([FromBody] CreateProgramRequest req)
    {
        var p = new Program
        {
            OrganizationId = cu.OrganizationId,
            CreatedByUserId = cu.UserId,
            Name = req.Name,
            Description = req.Description,
            IsTemplate = req.IsTemplate
        };
        p = await programRepo.CreateAsync(p);
        return new(p.Id, p.Name, p.Description, p.IsTemplate, 0, 0, p.CreatedAt);
    }

    [HttpPut("{id:guid}"), Authorize(Policy = "CoachOrAbove")]
    public async Task<ProgramDto> Update(Guid id, [FromBody] UpdateProgramRequest req)
    {
        var p = await programRepo.GetByIdAsync(id, cu.OrganizationId)
            ?? throw new KeyNotFoundException("Program not found");
        if (req.Name != null) p.Name = req.Name;
        if (req.Description != null) p.Description = req.Description;
        await programRepo.UpdateAsync(p);
        return new(p.Id, p.Name, p.Description, p.IsTemplate,
            p.Sessions.Count, p.AthletePrograms.Count, p.CreatedAt);
    }

    [HttpDelete("{id:guid}"), Authorize(Policy = "CoachOrAbove")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await programRepo.DeleteAsync(id);
        return NoContent();
    }

    // Sessions within a program
    [HttpPost("{programId:guid}/sessions"), Authorize(Policy = "CoachOrAbove")]
    public async Task<ProgramSessionDto> CreateSession(Guid programId, [FromBody] CreateProgramSessionRequest req)
    {
        var s = new ProgramSession
        {
            ProgramId = programId,
            DayOffset = req.DayOffset,
            Title = req.Title,
            Notes = req.Notes,
            Order = req.Order
        };
        s = await programRepo.CreateSessionAsync(s);
        return new(s.Id, s.ProgramId, s.DayOffset, s.Title, s.Notes, s.Order, []);
    }

    // WOD Pieces
    [HttpPost("sessions/{sessionId:guid}/pieces"), Authorize(Policy = "CoachOrAbove")]
    public async Task<WodPieceDto> CreatePiece(Guid sessionId, [FromBody] CreateWodPieceRequest req)
    {
        var piece = new WodPiece
        {
            ProgramSessionId = sessionId,
            Order = req.Order, Type = req.Type, Title = req.Title,
            Description = req.Description, VideoUrl = req.VideoUrl,
            TimeCap = req.TimeCap, Rounds = req.Rounds,
            RxDescription = req.RxDescription, ScaledDescription = req.ScaledDescription,
            CoachNotes = req.CoachNotes
        };
        piece = await programRepo.CreateWodPieceAsync(piece);
        return MapWodPiece(piece);
    }

    [HttpPut("pieces/{pieceId:guid}"), Authorize(Policy = "CoachOrAbove")]
    public async Task<WodPieceDto> UpdatePiece(Guid pieceId, [FromBody] UpdateWodPieceRequest req)
    {
        var p = await programRepo.GetWodPieceByIdAsync(pieceId)
            ?? throw new KeyNotFoundException("WodPiece not found");
        if (req.Title != null) p.Title = req.Title;
        if (req.Description != null) p.Description = req.Description;
        if (req.VideoUrl != null) p.VideoUrl = req.VideoUrl;
        if (req.TimeCap.HasValue) p.TimeCap = req.TimeCap;
        if (req.Rounds.HasValue) p.Rounds = req.Rounds;
        if (req.RxDescription != null) p.RxDescription = req.RxDescription;
        if (req.ScaledDescription != null) p.ScaledDescription = req.ScaledDescription;
        if (req.CoachNotes != null) p.CoachNotes = req.CoachNotes;
        p = await programRepo.UpdateWodPieceAsync(p);
        return MapWodPiece(p);
    }

    [HttpDelete("pieces/{pieceId:guid}"), Authorize(Policy = "CoachOrAbove")]
    public async Task<IActionResult> DeletePiece(Guid pieceId)
    {
        await programRepo.DeleteWodPieceAsync(pieceId);
        return NoContent();
    }
}

// ─── Sessions / Calendar ──────────────────────────────────────────────────────
[Route("api/sessions"), Authorize]
public class SessionsController(
    ISessionRepository sessionRepo,
    ICurrentUserService cu) : BaseController
{
    [HttpGet("calendar")]
    public async Task<List<CalendarEntryDto>> GetCalendar(
        [FromQuery] DateTime from, [FromQuery] DateTime to,
        [FromQuery] Guid? athleteId)
    {
        List<AthleteSession> sessions;
        if (cu.IsCoach)
        {
            sessions = await sessionRepo.GetByOrganizationAndRangeAsync(cu.OrganizationId, from, to);
            if (athleteId.HasValue) sessions = sessions.Where(s => s.AthleteId == athleteId).ToList();
        }
        else
        {
            sessions = await sessionRepo.GetByAthleteAndRangeAsync(cu.UserId, from, to);
        }

        return sessions.Select(s => new CalendarEntryDto(
            s.Id, s.AthleteId, s.Athlete?.Name ?? string.Empty, s.Athlete?.AvatarUrl,
            s.ScheduledDate, s.ProgramSession?.Title, s.Status,
            s.ProgramSession?.WodPieces.Count ?? 0, s.Feedbacks.Count)).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<AthleteSessionDetailDto> GetDetail(Guid id)
    {
        var s = await sessionRepo.GetDetailByIdAsync(id, cu.OrganizationId)
            ?? throw new KeyNotFoundException("Session not found");

        // Athletes can only see their own sessions
        if (!cu.IsCoach && s.AthleteId != cu.UserId) throw new UnauthorizedAccessException();

        var piecesWithOverride = s.ProgramSession.WodPieces.OrderBy(w => w.Order).Select(w =>
        {
            var ov = w.AthleteOverrides.FirstOrDefault(o => o.AthleteId == s.AthleteId);
            return new WodPieceWithOverrideDto(
                MapWodPiece(w),
                ov == null ? null : new AthleteOverrideDto(ov.Id, ov.AthleteId,
                    ov.DescriptionOverride, ov.ScaledOverride, ov.CoachNotes)
            );
        }).ToList();

        var sessionDto = new ProgramSessionDto(
            s.ProgramSession.Id, s.ProgramSession.ProgramId,
            s.ProgramSession.DayOffset, s.ProgramSession.Title,
            s.ProgramSession.Notes, s.ProgramSession.Order, []);

        return new AthleteSessionDetailDto(
            s.Id, s.ScheduledDate, s.Status, s.AthleteNotes,
            sessionDto, piecesWithOverride, s.Feedbacks.Select(MapFeedback).ToList());
    }

    [HttpPost("assign"), Authorize(Policy = "CoachOrAbove")]
    public async Task<IActionResult> Assign([FromBody] AssignSessionRequest req)
    {
        var sessions = req.AthleteIds.Select(athleteId => new AthleteSession
        {
            ProgramSessionId = req.ProgramSessionId,
            AthleteId = athleteId,
            ScheduledDate = req.ScheduledDate.ToUniversalTime()
        }).ToList();
        await sessionRepo.CreateBulkAsync(sessions);
        return Ok(new { created = sessions.Count });
    }

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateSessionStatusRequest req)
    {
        var s = await sessionRepo.GetDetailByIdAsync(id, cu.OrganizationId)
            ?? throw new KeyNotFoundException("Session not found");
        if (!cu.IsCoach && s.AthleteId != cu.UserId) throw new UnauthorizedAccessException();
        s.Status = req.Status;
        if (req.Notes != null) s.AthleteNotes = req.Notes;
        await sessionRepo.UpdateAsync(s);
        return Ok();
    }

    // Athlete overrides
    [HttpPut("pieces/{pieceId:guid}/override"), Authorize(Policy = "CoachOrAbove")]
    public async Task<AthleteOverrideDto> UpsertOverride(
        Guid pieceId, [FromQuery] Guid athleteId, [FromBody] UpsertAthleteOverrideRequest req)
    {
        var ov = await sessionRepo.UpsertOverrideAsync(new AthleteOverride
        {
            WodPieceId = pieceId, AthleteId = athleteId,
            DescriptionOverride = req.DescriptionOverride,
            ScaledOverride = req.ScaledOverride,
            CoachNotes = req.CoachNotes
        });
        return new(ov.Id, ov.AthleteId, ov.DescriptionOverride, ov.ScaledOverride, ov.CoachNotes);
    }
}

// ─── Feedback ─────────────────────────────────────────────────────────────────
[Route("api/sessions/{sessionId:guid}/feedback"), Authorize]
public class FeedbackController(
    IFeedbackRepository feedbackRepo,
    IMediaService mediaService,
    ICurrentUserService cu) : BaseController
{
    [HttpGet]
    public async Task<List<FeedbackDto>> List(Guid sessionId)
        => (await feedbackRepo.GetBySessionAsync(sessionId)).Select(MapFeedback).ToList();

    [HttpPost("text")]
    public async Task<FeedbackDto> AddText(Guid sessionId, [FromBody] CreateTextFeedbackRequest req)
    {
        var fb = new Feedback
        {
            AthleteSessionId = sessionId,
            UserId = cu.UserId,
            Type = FeedbackType.Text,
            TextContent = req.TextContent
        };
        fb = await feedbackRepo.CreateAsync(fb);
        fb.User = (await feedbackRepo.GetByIdAsync(fb.Id))!.User;
        return MapFeedback(fb);
    }

    [HttpPost("media/prepare")]
    public async Task<MediaUploadResponse> PrepareUpload(
        Guid sessionId,
        [FromQuery] string fileName,
        [FromQuery] string mimeType,
        [FromQuery] long fileSize)
    {
        var result = await mediaService.GenerateUploadUrlAsync(
            sessionId, cu.UserId, fileName, mimeType, fileSize);
        return result;
    }

    [HttpPost("media/confirm")]
    public async Task<FeedbackDto> ConfirmUpload(Guid sessionId, [FromBody] ConfirmUploadRequest req)
    {
        var type = req.MimeType.StartsWith("video/") ? FeedbackType.Video
                 : req.MimeType.StartsWith("image/") ? FeedbackType.Photo
                 : FeedbackType.File;
        var fb = new Feedback
        {
            AthleteSessionId = sessionId,
            UserId = cu.UserId,
            Type = type,
            MediaUrl = req.MediaUrl,
            FileName = req.FileName,
            FileSizeBytes = req.FileSizeBytes,
            MimeType = req.MimeType
        };
        fb = await feedbackRepo.CreateAsync(fb);
        fb.User = (await feedbackRepo.GetByIdAsync(fb.Id))!.User;
        return MapFeedback(fb);
    }

    [HttpPost("{feedbackId:guid}/reply"), Authorize(Policy = "CoachOrAbove")]
    public async Task<FeedbackDto> Reply(Guid sessionId, Guid feedbackId, [FromBody] CoachReplyRequest req)
    {
        var fb = await feedbackRepo.GetByIdAsync(feedbackId)
            ?? throw new KeyNotFoundException("Feedback not found");
        fb.CoachReply = req.Reply;
        fb.CoachRepliedAt = DateTime.UtcNow;
        fb = await feedbackRepo.UpdateAsync(fb);
        return MapFeedback(fb);
    }

    [HttpDelete("{feedbackId:guid}")]
    public async Task<IActionResult> Delete(Guid sessionId, Guid feedbackId)
    {
        var fb = await feedbackRepo.GetByIdAsync(feedbackId)
            ?? throw new KeyNotFoundException("Feedback not found");
        if (!cu.IsCoach && fb.UserId != cu.UserId) throw new UnauthorizedAccessException();
        if (fb.MediaUrl != null) await mediaService.DeleteMediaAsync(fb.MediaUrl);
        await feedbackRepo.DeleteAsync(feedbackId);
        return NoContent();
    }
}

public record ConfirmUploadRequest(string MediaUrl, string FileName, long FileSizeBytes, string MimeType);
