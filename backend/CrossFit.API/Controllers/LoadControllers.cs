using CrossFit.Core.DTOs.Load;
using CrossFit.Core.Entities.Load;
using CrossFit.Core.Interfaces;
using CrossFit.Infrastructure.Data;
using CrossFit.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CrossFit.API.Controllers;

// ─── Mesociclos ───────────────────────────────────────────────────────────────
[ApiController, Route("api/mesocycles"), Authorize(Policy = "CoachOrAbove")]
public class MesocyclesController(AppDbContext db, ICurrentUserService cu) : ControllerBase
{
    [HttpGet]
    public async Task<List<MesocycleDto>> List()
    {
        var mesos = await db.Mesocycles
            .Include(m => m.Blocks).ThenInclude(b => b.Weeks)
            .Where(m => m.OrganizationId == cu.OrganizationId && !m.IsDeleted)
            .OrderByDescending(m => m.StartDate)
            .ToListAsync();

        return mesos.Select(Map).ToList();
    }

    [HttpGet("{id:guid}")]
    public async Task<MesocycleDto> Get(Guid id)
    {
        var m = await db.Mesocycles
            .Include(m => m.Blocks).ThenInclude(b => b.Weeks)
            .FirstOrDefaultAsync(m => m.Id == id && m.OrganizationId == cu.OrganizationId)
            ?? throw new KeyNotFoundException("Mesociclo no encontrado");
        return Map(m);
    }

    [HttpPost]
    public async Task<MesocycleDto> Create([FromBody] CreateMesocycleRequest req)
    {
        var m = new Mesocycle
        {
            OrganizationId = cu.OrganizationId,
            CreatedByUserId = cu.UserId,
            Name = req.Name,
            Description = req.Description,
            StartDate = req.StartDate,
            EndDate = req.EndDate,
            GoalNotes = req.GoalNotes,
        };
        db.Mesocycles.Add(m);
        await db.SaveChangesAsync();
        return Map(m);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var m = await db.Mesocycles.FindAsync(id) ?? throw new KeyNotFoundException();
        m.IsDeleted = true;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{mesocycleId:guid}/blocks")]
    public async Task<TrainingBlockDto> CreateBlock(Guid mesocycleId, [FromBody] CreateTrainingBlockRequest req)
    {
        var block = new TrainingBlock
        {
            MesocycleId = mesocycleId,
            Type = req.Type,
            Name = req.Name,
            StartDate = req.StartDate,
            EndDate = req.StartDate.AddDays(req.WeekDuration * 7 - 1),
            WeekDuration = req.WeekDuration,
            TargetAvgRpe = req.TargetAvgRpe,
            TargetMinutesZ3Plus = req.TargetMinutesZ3Plus,
            TargetWeeklyVolumeTons = req.TargetWeeklyVolumeTons,
        };

        // Auto-generate week entries
        for (int w = 0; w < req.WeekDuration; w++)
        {
            block.Weeks.Add(new BlockWeek
            {
                WeekNumber = w + 1,
                StartDate = req.StartDate.AddDays(w * 7),
                PlannedIntensityFactor = 0.75 + w * 0.05, // progresión simple
            });
        }

        db.TrainingBlocks.Add(block);
        await db.SaveChangesAsync();
        return MapBlock(block);
    }

    private static MesocycleDto Map(Mesocycle m) => new(
        m.Id, m.Name, m.Description, m.StartDate, m.EndDate, m.GoalNotes,
        m.Blocks.Count,
        m.Blocks.Sum(b => b.WeekDuration),
        m.Blocks.Select(MapBlock).ToList()
    );

    private static TrainingBlockDto MapBlock(TrainingBlock b) => new(
        b.Id, b.MesocycleId, b.Type, b.Name, b.StartDate, b.EndDate, b.WeekDuration,
        b.TargetAvgRpe, b.TargetMinutesZ3Plus, b.TargetWeeklyVolumeTons,
        b.Weeks.OrderBy(w => w.WeekNumber).Select(w => new BlockWeekDto(
            w.Id, w.WeekNumber, w.StartDate, w.PlannedIntensityFactor, w.CoachNotes, w.IsDeload
        )).ToList()
    );
}

// ─── RMs ──────────────────────────────────────────────────────────────────────
[ApiController, Route("api/rms"), Authorize(Policy = "CoachOrAbove")]
public class RMsController(AppDbContext db, LoadAnalyticsService analytics, ICurrentUserService cu) : ControllerBase
{
    [HttpGet("table")]
    public Task<RMTableDto> GetTable([FromQuery] string[]? movements)
        => analytics.GetRMTableAsync(cu.OrganizationId, movements);

    [HttpGet("athlete/{athleteId:guid}")]
    public async Task<List<AthleteRMDto>> GetForAthlete(Guid athleteId)
    {
        var rms = await db.AthleteRMs
            .Include(r => r.Athlete)
            .Where(r => r.AthleteId == athleteId && r.OrganizationId == cu.OrganizationId)
            .OrderBy(r => r.MovementName)
            .ThenByDescending(r => r.TestedAt)
            .ToListAsync();

        return rms.Select(MapRM).ToList();
    }

    [HttpPost]
    public async Task<AthleteRMDto> Upsert([FromBody] UpsertAthleteRMRequest req)
    {
        var rm = await analytics.UpsertRMAsync(cu.OrganizationId, req);
        rm = await db.AthleteRMs.Include(r => r.Athlete).FirstAsync(r => r.Id == rm.Id);
        return MapRM(rm);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var rm = await db.AthleteRMs.FindAsync(id) ?? throw new KeyNotFoundException();
        db.AthleteRMs.Remove(rm);
        await db.SaveChangesAsync();
        return NoContent();
    }

    private static AthleteRMDto MapRM(AthleteRM r) => new(
        r.Id, r.AthleteId, r.Athlete?.Name ?? "",
        r.MovementName, r.Category, r.WeightKg, r.Reps,
        Math.Round(r.OneRmEstimated, 1), r.TestedAt, r.Notes
    );
}

// ─── Session Load ─────────────────────────────────────────────────────────────
[ApiController, Route("api/sessions/{sessionId:guid}/load"), Authorize]
public class SessionLoadController(LoadAnalyticsService analytics, ICurrentUserService cu, AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<SessionLoadDto?> Get(Guid sessionId)
    {
        var load = await db.SessionLoads
            .Include(l => l.MovementVolumes)
            .FirstOrDefaultAsync(l => l.AthleteSessionId == sessionId);

        return load == null ? null : MapLoad(load);
    }

    [HttpPut]
    public async Task<SessionLoadDto> Upsert(Guid sessionId, [FromBody] UpsertSessionLoadRequest req)
    {
        // Coaches can save for any athlete; athletes only for themselves
        var session = await db.AthleteSessions.FindAsync(sessionId)
            ?? throw new KeyNotFoundException("Session not found");

        if (!cu.IsCoach && session.AthleteId != cu.UserId)
            throw new UnauthorizedAccessException();

        var load = await analytics.UpsertSessionLoadAsync(
            sessionId, session.AthleteId, cu.OrganizationId, req);

        load = await db.SessionLoads
            .Include(l => l.MovementVolumes)
            .FirstAsync(l => l.Id == load.Id);

        return MapLoad(load);
    }

    private static SessionLoadDto MapLoad(SessionLoad l) => new(
        l.Id, l.AthleteSessionId, l.SessionDate,
        l.SessionRpe, l.DurationMinutes,
        l.MinutesZ1, l.MinutesZ2, l.MinutesZ3, l.MinutesZ4, l.MinutesZ5,
        l.LoadScore,
        l.MovementVolumes.Select(v => new MovementVolumeDto(
            v.Id, v.MovementName, v.Category, v.Sets, v.Reps,
            v.WeightKg, v.PercentRM, Math.Round(v.TonnageKg ?? 0, 1),
            v.RelativeIntensity.HasValue ? Math.Round(v.RelativeIntensity.Value * 100, 1) : null
        )).ToList()
    );
}

// ─── Analytics Dashboard ──────────────────────────────────────────────────────
[ApiController, Route("api/analytics"), Authorize]
public class AnalyticsController(LoadAnalyticsService analytics, ICurrentUserService cu) : ControllerBase
{
    [HttpGet("athlete/{athleteId:guid}")]
    public async Task<AthleteDashboardDto> GetAthleteDashboard(
        Guid athleteId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        if (!cu.IsCoach && athleteId != cu.UserId) throw new UnauthorizedAccessException();
        var f = from ?? DateTime.UtcNow.AddDays(-84); // 12 semanas
        var t = to ?? DateTime.UtcNow;
        return await analytics.GetAthleteDashboardAsync(athleteId, f, t);
    }

    [HttpGet("me")]
    public Task<AthleteDashboardDto> GetMyDashboard(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var f = from ?? DateTime.UtcNow.AddDays(-84);
        var t = to ?? DateTime.UtcNow;
        return analytics.GetAthleteDashboardAsync(cu.UserId, f, t);
    }

    [HttpGet("overview"), Authorize(Policy = "CoachOrAbove")]
    public Task<CoachOverviewDto> GetCoachOverview(
        [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var f = from ?? DateTime.UtcNow.AddDays(-28);
        var t = to ?? DateTime.UtcNow;
        return analytics.GetCoachOverviewAsync(cu.OrganizationId, f, t);
    }

    [HttpGet("acwr/{athleteId:guid}"), Authorize(Policy = "CoachOrAbove")]
    public Task<AcwrChartDto> GetAcwr(Guid athleteId,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var f = from ?? DateTime.UtcNow.AddDays(-84);
        var t = to ?? DateTime.UtcNow;
        return analytics.GetAcwrAsync(athleteId, f, t);
    }

    [HttpGet("intensity/{athleteId:guid}"), Authorize(Policy = "CoachOrAbove")]
    public Task<IntensityDistributionDto> GetIntensityDistribution(Guid athleteId,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var f = from ?? DateTime.UtcNow.AddDays(-28);
        var t = to ?? DateTime.UtcNow;
        return analytics.GetIntensityDistributionAsync(athleteId, f, t);
    }

    [HttpGet("volumes/{athleteId:guid}"), Authorize(Policy = "CoachOrAbove")]
    public Task<List<MovementVolumeReportDto>> GetVolumeReport(Guid athleteId,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var f = from ?? DateTime.UtcNow.AddDays(-84);
        var t = to ?? DateTime.UtcNow;
        return analytics.GetMovementVolumeReportAsync(athleteId, f, t);
    }
}
