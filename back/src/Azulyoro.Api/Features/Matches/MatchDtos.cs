namespace Azulyoro.Api.Features.Matches;

public record MatchDto(
    Guid Id,
    int ExtId,
    DateTime DateUtc,
    string Status,
    Guid CompetitionId,
    string? CompetitionName,
    Guid HomeTeamId,
    string? HomeTeamName,
    string? HomeTeamLogoUrl,
    Guid AwayTeamId,
    string? AwayTeamName,
    string? AwayTeamLogoUrl,
    int? HomeGoals,
    int? AwayGoals,
    bool IsBoca,
    string? Round = null,
    int? PenaltyHome = null,
    int? PenaltyAway = null,
    DateTime? LastSyncedAt = null,
    int? Season = null);

public record MatchDetailDto(
    Guid Id,
    int ExtId,
    DateTime DateUtc,
    string Status,
    Guid CompetitionId,
    string? CompetitionName,
    Guid HomeTeamId,
    string? HomeTeamName,
    string? HomeTeamLogoUrl,
    Guid AwayTeamId,
    string? AwayTeamName,
    string? AwayTeamLogoUrl,
    int? HomeGoals,
    int? AwayGoals,
    bool IsBoca,
    string? Venue,
    string? Round,
    int? HtHome,
    int? HtAway,
    int? FtHome,
    int? FtAway,
    int? Elapsed,
    int? PenaltyHome = null,
    int? PenaltyAway = null);

public record EventDto(
    int Minute,
    int? ExtraMinute,
    string Type,
    string? Detail,
    Guid? TeamId,
    string? TeamName,
    Guid? PlayerId,
    string? PlayerName,
    string? PlayerPhotoUrl,
    Guid? AssistPlayerId,
    string? AssistName,
    string? AssistPhotoUrl);

public record LineupPlayerDto(
    Guid PlayerId,
    string? PlayerName,
    string? PhotoUrl,
    bool IsStarter,
    string? Grid,
    int? Number);

public record LineupDto(
    Guid TeamId,
    string? TeamName,
    string? Formation,
    string? CoachName,
    IReadOnlyList<LineupPlayerDto> Players);

public record PlayerStatDto(
    Guid PlayerId,
    string? PlayerName,
    Guid TeamId,
    string? TeamName,
    int? Minutes,
    decimal? Rating,
    int Goals,
    int Assists,
    int ShotsTotal,
    int ShotsOn,
    int Passes,
    int? PassesAccuracy,
    int Tackles,
    int Yellow,
    int Red);
