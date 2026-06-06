using CrossFit.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace CrossFit.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserCoachAssignment> CoachAssignments => Set<UserCoachAssignment>();
    public DbSet<Program> Programs => Set<Program>();
    public DbSet<AthleteProgram> AthletePrograms => Set<AthleteProgram>();
    public DbSet<ProgramSession> ProgramSessions => Set<ProgramSession>();
    public DbSet<WodPiece> WodPieces => Set<WodPiece>();
    public DbSet<WodTemplate> WodTemplates => Set<WodTemplate>();
    public DbSet<AthleteOverride> AthleteOverrides => Set<AthleteOverride>();
    public DbSet<AthleteSession> AthleteSessions => Set<AthleteSession>();
    public DbSet<Feedback> Feedbacks => Set<Feedback>();

    protected override void OnModelCreating(ModelBuilder mb)
    {
        base.OnModelCreating(mb);

        // ─── Organization ────────────────────────────────────────────────────
        mb.Entity<Organization>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Slug).IsUnique();
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.Property(x => x.Slug).HasMaxLength(60).IsRequired();
            e.Property(x => x.PrimaryColor).HasMaxLength(7);
            e.Property(x => x.SecondaryColor).HasMaxLength(7);
            e.Property(x => x.AccentColor).HasMaxLength(7);
            e.HasQueryFilter(x => !x.IsDeleted);
        });

        // ─── User ─────────────────────────────────────────────────────────────
        mb.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.GoogleId).IsUnique();
            e.HasIndex(x => new { x.Email, x.OrganizationId }).IsUnique();
            e.Property(x => x.Email).HasMaxLength(255).IsRequired();
            e.Property(x => x.Name).HasMaxLength(100).IsRequired();
            e.HasOne(x => x.Organization)
             .WithMany(x => x.Users)
             .HasForeignKey(x => x.OrganizationId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(x => !x.IsDeleted);
        });

        // ─── CoachAssignment ─────────────────────────────────────────────────
        mb.Entity<UserCoachAssignment>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.CoachId, x.AthleteId }).IsUnique();
            e.HasOne(x => x.Coach)
             .WithMany()
             .HasForeignKey(x => x.CoachId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Athlete)
             .WithMany(x => x.CoachAssignments)
             .HasForeignKey(x => x.AthleteId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ─── Program ─────────────────────────────────────────────────────────
        mb.Entity<Program>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(150).IsRequired();
            e.HasOne(x => x.Organization)
             .WithMany(x => x.Programs)
             .HasForeignKey(x => x.OrganizationId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.CreatedBy)
             .WithMany()
             .HasForeignKey(x => x.CreatedByUserId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(x => !x.IsDeleted);
        });

        // ─── AthleteProgram ───────────────────────────────────────────────────
        mb.Entity<AthleteProgram>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Program)
             .WithMany(x => x.AthletePrograms)
             .HasForeignKey(x => x.ProgramId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Athlete)
             .WithMany()
             .HasForeignKey(x => x.AthleteId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ─── ProgramSession ───────────────────────────────────────────────────
        mb.Entity<ProgramSession>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.Program)
             .WithMany(x => x.Sessions)
             .HasForeignKey(x => x.ProgramId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasQueryFilter(x => !x.IsDeleted);
        });

        // ─── WodPiece ─────────────────────────────────────────────────────────
        mb.Entity<WodPiece>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.HasOne(x => x.ProgramSession)
             .WithMany(x => x.WodPieces)
             .HasForeignKey(x => x.ProgramSessionId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasQueryFilter(x => !x.IsDeleted);
        });

        // ─── AthleteOverride ──────────────────────────────────────────────────
        mb.Entity<AthleteOverride>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.WodPieceId, x.AthleteId }).IsUnique();
            e.HasOne(x => x.WodPiece)
             .WithMany(x => x.AthleteOverrides)
             .HasForeignKey(x => x.WodPieceId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Athlete)
             .WithMany()
             .HasForeignKey(x => x.AthleteId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ─── AthleteSession ───────────────────────────────────────────────────
        mb.Entity<AthleteSession>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.AthleteId, x.ScheduledDate });
            e.HasOne(x => x.ProgramSession)
             .WithMany(x => x.AthleteSessions)
             .HasForeignKey(x => x.ProgramSessionId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Athlete)
             .WithMany(x => x.AthleteSessions)
             .HasForeignKey(x => x.AthleteId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(x => !x.IsDeleted);
        });

        // ─── Feedback ─────────────────────────────────────────────────────────
        mb.Entity<Feedback>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasOne(x => x.AthleteSession)
             .WithMany(x => x.Feedbacks)
             .HasForeignKey(x => x.AthleteSessionId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.User)
             .WithMany(x => x.Feedbacks)
             .HasForeignKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(x => !x.IsDeleted);
        });

        // ─── WodTemplate ──────────────────────────────────────────────────────
        mb.Entity<WodTemplate>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.HasOne(x => x.Organization)
             .WithMany(x => x.WodTemplates)
             .HasForeignKey(x => x.OrganizationId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Modified)
                entry.Entity.UpdatedAt = DateTime.UtcNow;
        }
        return base.SaveChangesAsync(ct);
    }
}
