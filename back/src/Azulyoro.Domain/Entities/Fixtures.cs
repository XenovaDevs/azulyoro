using Azulyoro.Domain.Common;
using Azulyoro.Domain.Enums;

namespace Azulyoro.Domain.Entities;

public class Fixture : Entity
{
    public int ExtId { get; set; }

    public Guid CompetitionId { get; set; }
    public Competition? Competition { get; set; }
    public Guid SeasonId { get; set; }
    public Season? Season { get; set; }

    public string? Round { get; set; }
    public DateTime DateUtc { get; set; }
    public FixtureStatus Status { get; set; }
    public int? Elapsed { get; set; }
    public string? VenueName { get; set; }

    public Guid HomeTeamId { get; set; }
    public Team? HomeTeam { get; set; }
    public Guid AwayTeamId { get; set; }
    public Team? AwayTeam { get; set; }

    public int? HomeGoals { get; set; }
    public int? AwayGoals { get; set; }
    public int? HtHome { get; set; }
    public int? HtAway { get; set; }
    public int? FtHome { get; set; }
    public int? FtAway { get; set; }

    /// <summary>True when Boca plays (either side) — powers the (is_boca,date) index.</summary>
    public bool IsBoca { get; set; }
    public DateTime? LastSyncedAt { get; set; }

    public ICollection<FixtureEvent> Events { get; set; } = new List<FixtureEvent>();
    public ICollection<FixtureLineup> Lineups { get; set; } = new List<FixtureLineup>();
    public ICollection<FixturePlayerStats> PlayerStats { get; set; } = new List<FixturePlayerStats>();
}

public class FixtureEvent : Entity
{
    public Guid FixtureId { get; set; }
    public Fixture? Fixture { get; set; }

    /// <summary>Stable ordinal within the fixture for idempotent upsert.</summary>
    public int ExtSeq { get; set; }
    public int Minute { get; set; }
    public int? ExtraMinute { get; set; }

    public Guid? TeamId { get; set; }
    public string? TeamName { get; set; }
    public Guid? PlayerId { get; set; }
    public string? PlayerName { get; set; }
    public Guid? AssistPlayerId { get; set; }
    public string? AssistName { get; set; }

    public EventType Type { get; set; }
    public string? Detail { get; set; }
    public string? Comments { get; set; }
}

public class FixtureLineup : Entity
{
    public Guid FixtureId { get; set; }
    public Fixture? Fixture { get; set; }
    public Guid TeamId { get; set; }
    public Team? Team { get; set; }

    public string? Formation { get; set; }
    public string? CoachName { get; set; }

    public ICollection<FixtureLineupPlayer> Players { get; set; } = new List<FixtureLineupPlayer>();
}

public class FixtureLineupPlayer : Entity
{
    public Guid LineupId { get; set; }
    public FixtureLineup? Lineup { get; set; }

    /// <summary>Loose ref — may point at an opponent player we don't ingest.</summary>
    public Guid PlayerId { get; set; }

    public bool IsStarter { get; set; }
    public string? Grid { get; set; }
    public int? Number { get; set; }
}

public class FixturePlayerStats : Entity
{
    public Guid FixtureId { get; set; }
    public Fixture? Fixture { get; set; }

    /// <summary>Loose refs — lineups/stats can include opponent players/teams.</summary>
    public Guid PlayerId { get; set; }
    public Guid TeamId { get; set; }

    public int? Minutes { get; set; }
    public decimal? Rating { get; set; }
    public int Goals { get; set; }
    public int Assists { get; set; }
    public int ShotsTotal { get; set; }
    public int ShotsOn { get; set; }
    public int Passes { get; set; }
    public int? PassesAccuracy { get; set; }
    public int Tackles { get; set; }
    public int Yellow { get; set; }
    public int Red { get; set; }
}
