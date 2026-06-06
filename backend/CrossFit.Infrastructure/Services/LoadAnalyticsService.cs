using CrossFit.Core.DTOs.Load;
using CrossFit.Core.Entities;
using CrossFit.Core.Entities.Load;
using CrossFit.Core.Enums;
using CrossFit.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CrossFit.Infrastructure.Services;

public class LoadAnalyticsService(AppDbContext db)
{
    // ─── Upsert SessionLoad ───────────────────────────────────────────────────
    public async Task<SessionLoad> UpsertSessionLoadAsync(
        Guid athleteSessionId, Guid athleteId, Guid orgId,
        UpsertSessionLoadRequest req)
    {
        var session = await db.AthleteSessions
            .FirstOrDefaultAsync(s => s.Id == athleteSessionId)
            ?? throw new KeyNotFoundException("Session not found");

        var load = await db.SessionLoads
            .Include(l => l.MovementVolumes)
            .FirstOrDefaultAsync(l => l.AthleteSessionId == athleteSessionId && l.AthleteId == athleteId);

        if (load == null)
        {
            load = new SessionLoad
            {
                AthleteSessionId = athleteSessionId,
                AthleteId = athleteId,
                OrganizationId = orgId,
                SessionDate = session.ScheduledDate,
            };
            db.SessionLoads.Add(load);
        }

        load.SessionRpe = req.SessionRpe;
        load.DurationMinutes = req.DurationMinutes;
        load.MinutesZ1 = req.MinutesZ1;
        load.MinutesZ2 = req.MinutesZ2;
        load.MinutesZ3 = req.MinutesZ3;
        load.MinutesZ4 = req.MinutesZ4;
        load.MinutesZ5 = req.MinutesZ5;
        load.RecalculateLoad();

        // Replace movement volumes
        if (load.MovementVolumes.Any())
            db.MovementVolumes.RemoveRange(load.MovementVolumes);

        foreach (var mv in req.MovementVolumes)
        {
            // Auto-fill relative intensity from latest RM
            double? relativeIntensity = null;
            if (mv.WeightKg.HasValue)
            {
                var latestRm = await db.AthleteRMs
                    .Where(r => r.AthleteId == athleteId && r.MovementName == mv.MovementName)
                    .OrderByDescending(r => r.TestedAt)
                    .FirstOrDefaultAsync();
                if (latestRm != null)
                    relativeIntensity = mv.WeightKg.Value / latestRm.OneRmEstimated;
            }

            db.MovementVolumes.Add(new MovementVolume
            {
                SessionLoadId = load.Id,
                AthleteId = athleteId,
                MovementName = mv.MovementName,
                Category = mv.Category,
                Sets = mv.Sets,
                Reps = mv.Reps,
                WeightKg = mv.WeightKg,
                PercentRM = mv.PercentRM,
                RelativeIntensity = mv.PercentRM.HasValue ? mv.PercentRM / 100.0 : relativeIntensity,
            });
        }

        await db.SaveChangesAsync();
        await RefreshWeeklySnapshotAsync(athleteId, orgId, load.SessionDate);
        return load;
    }

    // ─── Upsert RM ───────────────────────────────────────────────────────────
    public async Task<AthleteRM> UpsertRMAsync(Guid orgId, UpsertAthleteRMRequest req)
    {
        var rm = new AthleteRM
        {
            AthleteId = req.AthleteId,
            OrganizationId = orgId,
            MovementName = req.MovementName,
            Category = req.Category,
            WeightKg = req.WeightKg,
            Reps = req.Reps,
            OneRmEstimated = AthleteRM.EstimateOneRM(req.WeightKg, req.Reps),
            TestedAt = req.TestedAt,
            Notes = req.Notes,
        };
        db.AthleteRMs.Add(rm);
        await db.SaveChangesAsync();
        return rm;
    }

    // ─── RM Table (hoja de cálculo de RMs) ────────────────────────────────────
    public async Task<RMTableDto> GetRMTableAsync(Guid orgId, string[]? movements = null)
    {
        var athletes = await db.Users
            .Where(u => u.OrganizationId == orgId && u.Role == Core.Enums.UserRole.Athlete)
            .OrderBy(u => u.Name)
            .ToListAsync();

        var rmsQuery = db.AthleteRMs.Where(r => r.OrganizationId == orgId);
        if (movements?.Length > 0) rmsQuery = rmsQuery.Where(r => movements.Contains(r.MovementName));

        var allRms = await rmsQuery.ToListAsync();

        // Get latest RM per athlete × movement
        var latestRms = allRms
            .GroupBy(r => (r.AthleteId, r.MovementName))
            .Select(g => g.OrderByDescending(r => r.TestedAt).First())
            .ToList();

        var movementNames = latestRms.Select(r => r.MovementName).Distinct().OrderBy(x => x).ToList();

        var rows = athletes.Select(a =>
        {
            var rmMap = latestRms
                .Where(r => r.AthleteId == a.Id)
                .ToDictionary(r => r.MovementName, r => (double?)r.OneRmEstimated);
            return new RMRowDto(a.Id, a.Name, a.AvatarUrl,
                movementNames.ToDictionary(m => m, m => rmMap.GetValueOrDefault(m)));
        }).ToList();

        return new RMTableDto(movementNames, rows);
    }

    // ─── ACWR Chart ──────────────────────────────────────────────────────────
    public async Task<AcwrChartDto> GetAcwrAsync(Guid athleteId, DateTime from, DateTime to)
    {
        var athlete = await db.Users.FindAsync(athleteId) ?? throw new KeyNotFoundException();

        var loads = await db.SessionLoads
            .Where(l => l.AthleteId == athleteId && l.SessionDate >= from.AddDays(-28) && l.SessionDate <= to)
            .OrderBy(l => l.SessionDate)
            .ToListAsync();

        var dates = new List<DateTime>();
        var acute = new List<double?>();
        var chronic = new List<double?>();
        var ratios = new List<double?>();

        for (var d = from; d <= to; d = d.AddDays(1))
        {
            dates.Add(d);

            var acute7 = loads.Where(l => l.SessionDate >= d.AddDays(-6) && l.SessionDate <= d)
                              .Sum(l => l.LoadScore ?? 0);
            var chronic28 = loads.Where(l => l.SessionDate >= d.AddDays(-27) && l.SessionDate <= d)
                                 .Sum(l => l.LoadScore ?? 0) / 4.0;

            acute.Add(acute7);
            chronic.Add(chronic28);
            ratios.Add(chronic28 > 0 ? Math.Round(acute7 / chronic28, 2) : null);
        }

        return new AcwrChartDto(dates, acute, chronic, ratios,
            athleteId.ToString(), athlete.Name);
    }

    // ─── Intensity Distribution ───────────────────────────────────────────────
    public async Task<IntensityDistributionDto> GetIntensityDistributionAsync(
        Guid athleteId, DateTime from, DateTime to)
    {
        var loads = await db.SessionLoads
            .Where(l => l.AthleteId == athleteId && l.SessionDate >= from && l.SessionDate <= to)
            .ToListAsync();

        var z1 = loads.Sum(l => l.MinutesZ1 ?? 0);
        var z2 = loads.Sum(l => l.MinutesZ2 ?? 0);
        var z3 = loads.Sum(l => l.MinutesZ3 ?? 0);
        var z4 = loads.Sum(l => l.MinutesZ4 ?? 0);
        var z5 = loads.Sum(l => l.MinutesZ5 ?? 0);
        var total = z1 + z2 + z3 + z4 + z5;

        double Pct(int v) => total > 0 ? Math.Round(v * 100.0 / total, 1) : 0;

        return new IntensityDistributionDto(z1, z2, z3, z4, z5,
            Pct(z1), Pct(z2), Pct(z3), Pct(z4), Pct(z5), total);
    }

    // ─── Movement Volume Report ────────────────────────────────────────────────
    public async Task<List<MovementVolumeReportDto>> GetMovementVolumeReportAsync(
        Guid athleteId, DateTime from, DateTime to)
    {
        var vols = await db.MovementVolumes
            .Where(v => v.AthleteId == athleteId
                     && v.SessionLoad.SessionDate >= from
                     && v.SessionLoad.SessionDate <= to)
            .Include(v => v.SessionLoad)
            .ToListAsync();

        return vols
            .GroupBy(v => v.MovementName)
            .Select(g =>
            {
                var byWeek = g
                    .GroupBy(v => StartOfWeek(v.SessionLoad.SessionDate))
                    .OrderBy(w => w.Key)
                    .Select(w => new VolumeByWeekDto(
                        w.Key,
                        Math.Round(w.Sum(v => v.TonnageKg ?? 0), 1),
                        Math.Round(w.Where(v => v.RelativeIntensity.HasValue)
                                    .Select(v => v.RelativeIntensity!.Value)
                                    .DefaultIfEmpty(0).Average() * 100, 1)
                    )).ToList();

                var avgRi = g.Where(v => v.RelativeIntensity.HasValue)
                             .Select(v => v.RelativeIntensity!.Value)
                             .DefaultIfEmpty(0).Average();

                return new MovementVolumeReportDto(
                    g.Key,
                    g.First().Category,
                    Math.Round(g.Sum(v => v.TonnageKg ?? 0), 1),
                    g.Sum(v => v.Sets),
                    g.Sum(v => v.Sets * v.Reps),
                    Math.Round(avgRi * 100, 1),
                    byWeek
                );
            })
            .OrderByDescending(r => r.TotalTonnageKg)
            .ToList();
    }

    // ─── Full athlete dashboard ────────────────────────────────────────────────
    public async Task<AthleteDashboardDto> GetAthleteDashboardAsync(
        Guid athleteId, DateTime from, DateTime to)
    {
        var athlete = await db.Users.FindAsync(athleteId) ?? throw new KeyNotFoundException();

        var snapshots = await db.WeeklyLoadSnapshots
            .Where(s => s.AthleteId == athleteId && s.WeekStart >= from && s.WeekStart <= to)
            .OrderBy(s => s.WeekStart)
            .ToListAsync();

        var weeklyLoads = snapshots.Select(s => new WeeklyLoadDto(
            s.WeekStart, s.TotalLoadScore, s.TotalMinutes, s.MinutesZ3Plus,
            s.AvgRpe, s.SessionCount, s.TotalTonnageKg,
            s.AcwrRatio, s.AcuteLoad7d, s.ChronicLoad28d
        )).ToList();

        var intensity = await GetIntensityDistributionAsync(athleteId, from, to);
        var movements = await GetMovementVolumeReportAsync(athleteId, from, to);
        var acwr = await GetAcwrAsync(athleteId, from, to);

        var lastWeekRpe = snapshots.LastOrDefault()?.AvgRpe;
        double? trend = null;
        if (snapshots.Count >= 2)
        {
            var last = snapshots[^1].TotalLoadScore;
            var prev = snapshots[^2].TotalLoadScore;
            trend = prev > 0 ? Math.Round((last - prev) / prev * 100, 1) : null;
        }

        return new AthleteDashboardDto(
            athleteId.ToString(), athlete.Name, athlete.AvatarUrl,
            weeklyLoads, intensity, movements, acwr, lastWeekRpe, trend
        );
    }

    // ─── Coach overview (todos los atletas) ────────────────────────────────────
    public async Task<CoachOverviewDto> GetCoachOverviewAsync(Guid orgId, DateTime from, DateTime to)
    {
        var athletes = await db.Users
            .Where(u => u.OrganizationId == orgId && u.Role == Core.Enums.UserRole.Athlete)
            .ToListAsync();

        var summaries = new List<AthleteLoadSummaryDto>();
        foreach (var a in athletes)
        {
            var lastSnap = await db.WeeklyLoadSnapshots
                .Where(s => s.AthleteId == a.Id)
                .OrderByDescending(s => s.WeekStart)
                .FirstOrDefaultAsync();

            var risk = lastSnap?.AcwrRatio switch
            {
                < 0.8 => "low",
                > 1.3 => "high",
                _ => "moderate"
            };

            summaries.Add(new AthleteLoadSummaryDto(
                a.Id.ToString(), a.Name, a.AvatarUrl,
                lastSnap?.TotalLoadScore, lastSnap?.AcwrRatio,
                lastSnap?.AvgRpe, risk));
        }

        // Org-wide intensity
        var allLoads = await db.SessionLoads
            .Where(l => l.OrganizationId == orgId && l.SessionDate >= from && l.SessionDate <= to)
            .ToListAsync();

        var z1 = allLoads.Sum(l => l.MinutesZ1 ?? 0);
        var z2 = allLoads.Sum(l => l.MinutesZ2 ?? 0);
        var z3 = allLoads.Sum(l => l.MinutesZ3 ?? 0);
        var z4 = allLoads.Sum(l => l.MinutesZ4 ?? 0);
        var z5 = allLoads.Sum(l => l.MinutesZ5 ?? 0);
        var total = z1 + z2 + z3 + z4 + z5;
        double Pct(int v) => total > 0 ? Math.Round(v * 100.0 / total, 1) : 0;

        var orgDist = new IntensityDistributionDto(z1, z2, z3, z4, z5,
            Pct(z1), Pct(z2), Pct(z3), Pct(z4), Pct(z5), total);

        var avgRpe = allLoads.Where(l => l.SessionRpe.HasValue)
                             .Select(l => l.SessionRpe!.Value)
                             .DefaultIfEmpty(0).Average();

        var totalTonnage = await db.MovementVolumes
            .Where(v => v.SessionLoad.OrganizationId == orgId
                     && v.SessionLoad.SessionDate >= from
                     && v.SessionLoad.SessionDate <= to)
            .SumAsync(v => (double?)v.TonnageKg ?? 0);

        return new CoachOverviewDto(summaries, orgDist, Math.Round(avgRpe, 1), Math.Round(totalTonnage, 0));
    }

    // ─── Refresh weekly snapshot (llamado tras cada SessionLoad guardado) ─────
    public async Task RefreshWeeklySnapshotAsync(Guid athleteId, Guid orgId, DateTime sessionDate)
    {
        var weekStart = StartOfWeek(sessionDate);

        var loads = await db.SessionLoads
            .Include(l => l.MovementVolumes)
            .Include(l => l.AthleteSession)
            .Where(l => l.AthleteId == athleteId
                     && l.SessionDate >= weekStart
                     && l.SessionDate < weekStart.AddDays(7))
            .ToListAsync();

        // ACWR
        var allLoads = await db.SessionLoads
            .Where(l => l.AthleteId == athleteId
                     && l.SessionDate >= weekStart.AddDays(-27)
                     && l.SessionDate <= weekStart.AddDays(6))
            .ToListAsync();

        var acute7 = allLoads
            .Where(l => l.SessionDate >= weekStart && l.SessionDate < weekStart.AddDays(7))
            .Sum(l => l.LoadScore ?? 0);
        var chronic28 = allLoads.Sum(l => l.LoadScore ?? 0) / 4.0;

        var snap = await db.WeeklyLoadSnapshots
            .FirstOrDefaultAsync(s => s.AthleteId == athleteId && s.WeekStart == weekStart);

        var sessions = await db.AthleteSessions
            .Where(s => s.AthleteId == athleteId
                     && s.ScheduledDate >= weekStart
                     && s.ScheduledDate < weekStart.AddDays(7))
            .ToListAsync();

        if (snap == null)
        {
            snap = new WeeklyLoadSnapshot { AthleteId = athleteId, OrganizationId = orgId, WeekStart = weekStart };
            db.WeeklyLoadSnapshots.Add(snap);
        }

        var validRpes = loads.Where(l => l.SessionRpe.HasValue).Select(l => l.SessionRpe!.Value).ToList();

        snap.TotalLoadScore = Math.Round(loads.Sum(l => l.LoadScore ?? 0), 1);
        snap.TotalMinutes = loads.Sum(l => l.DurationMinutes ?? 0);
        snap.MinutesZ3Plus = loads.Sum(l => l.TotalMinutesZ3Plus);
        snap.AvgRpe = validRpes.Any() ? Math.Round(validRpes.Average(), 1) : 0;
        snap.SessionCount = loads.Count;
        snap.TotalTonnageKg = Math.Round(loads.SelectMany(l => l.MovementVolumes).Sum(v => v.TonnageKg ?? 0), 1);
        snap.CompletedSessions = sessions.Count(s => s.Status == SessionStatus.Completed);
        snap.SkippedSessions = sessions.Count(s => s.Status == SessionStatus.Skipped);
        snap.AcuteLoad7d = Math.Round(acute7, 1);
        snap.ChronicLoad28d = Math.Round(chronic28, 1);
        snap.AcwrRatio = chronic28 > 0 ? Math.Round(acute7 / chronic28, 2) : null;

        await db.SaveChangesAsync();
    }

    private static DateTime StartOfWeek(DateTime date)
    {
        var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
        return date.AddDays(-diff).Date;
    }
}
