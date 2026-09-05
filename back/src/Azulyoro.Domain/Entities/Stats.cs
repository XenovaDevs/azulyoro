using Azulyoro.Domain.Common;

namespace Azulyoro.Domain.Entities;

public class PlayerSeasonStats : Entity
{
    public Guid PlayerId { get; set; }
    public Player? Player { get; set; }
    public Guid CompetitionId { get; set; }
    public Guid SeasonId { get; set; }

    public int Appearances { get; set; }
    public int Minutes { get; set; }
    public int Goals { get; set; }
    public int Assists { get; set; }
    public int Yellow { get; set; }
    public int Red { get; set; }
    public decimal? Rating { get; set; }
}

public class Standing : Entity
{
    public Guid CompetitionId { get; set; }
    public Competition? Competition { get; set; }
    public Guid SeasonId { get; set; }
    public Guid TeamId { get; set; }
    public Team? Team { get; set; }

    public int Rank { get; set; }
    public int Points { get; set; }
    public int GoalsDiff { get; set; }
    public int Played { get; set; }
    public int Win { get; set; }
    public int Draw { get; set; }
    public int Lose { get; set; }
    public int GoalsFor { get; set; }
    public int GoalsAgainst { get; set; }
    public string? Form { get; set; }
    public string GroupName { get; set; } = string.Empty;
    public DateTime? SourceUpdatedAtUtc { get; set; }
}
