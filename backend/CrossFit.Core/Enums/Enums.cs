namespace CrossFit.Core.Enums;

public enum UserRole
{
    Athlete = 0,
    Coach = 1,
    HeadCoach = 2
}

public enum WodPieceType
{
    Warmup,
    Strength,
    MetCon,
    EMOM,
    AMRAP,
    ForTime,
    Skill,
    Cooldown,
    Gymnastics,
    Endurance,
    Custom
}

public enum FeedbackType
{
    Text,
    Video,
    Photo,
    File
}

public enum SubscriptionPlan
{
    Starter,
    Pro,
    WhiteLabel
}

public enum SessionStatus
{
    Scheduled,
    Completed,
    Skipped
}
