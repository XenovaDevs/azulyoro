namespace Azulyoro.Infrastructure.Sync;

public sealed class SportsSyncOptions
{
    public const string SectionName = "SportsSync";

    public int TeamExtId { get; set; } = 451;
    public int PrimaryLeagueExtId { get; set; } = 128;

    /// <summary>
    /// API-Football season to ingest. It is configurable because provider
    /// plans can restrict which seasons are available.
    /// </summary>
    public int Season { get; set; } = 2024;

    /// <summary>Maximum player pages allowed by the current provider plan.</summary>
    public int MaxPlayerPages { get; set; } = 3;

    /// <summary>Seconds between the single live-provider polls.</summary>
    public int LivePollIntervalSeconds { get; set; } = 30;

    /// <summary>How far ahead to poll scheduled Boca fixtures for kickoff changes.</summary>
    public int LiveLookaheadHours { get; set; } = 1;

    /// <summary>How long after kickoff a fixture remains eligible for live polling.</summary>
    public int LiveLookbehindHours { get; set; } = 4;

    public int StandingsRetryIntervalSeconds { get; set; } = 300;
    public int StandingsRetryWindowHours { get; set; } = 6;
}
