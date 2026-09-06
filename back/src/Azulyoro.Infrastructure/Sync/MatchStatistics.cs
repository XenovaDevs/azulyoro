using System.Globalization;
using System.Text.Json;
using Azulyoro.Domain.Entities;
using Azulyoro.Infrastructure.ApiFootball;
using Azulyoro.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Azulyoro.Infrastructure.Sync;

public sealed record MatchStatisticDto(string Key, decimal? Home, decimal? Away);
public sealed record MatchStatisticsDto(DateTime? UpdatedAt, IReadOnlyList<MatchStatisticDto> Statistics);

/// <summary>Team totals come only from provider team statistics, never from player sums.</summary>
public static class MatchStatistics
{
    private static readonly IReadOnlyDictionary<string, string> Keys = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
    {
        ["Ball Possession"] = "possession", ["Total Shots"] = "shotsTotal",
        ["Shots on Goal"] = "shotsOnGoal", ["Shots off Goal"] = "shotsOffGoal",
        ["Blocked Shots"] = "blockedShots", ["Shots insidebox"] = "shotsInsideBox",
        ["Shots outsidebox"] = "shotsOutsideBox", ["Fouls"] = "fouls",
        ["Corner Kicks"] = "corners", ["Offsides"] = "offsides",
        ["Yellow Cards"] = "yellowCards", ["Red Cards"] = "redCards",
        ["Goalkeeper Saves"] = "saves", ["Total passes"] = "passesTotal",
        ["Passes accurate"] = "passesAccurate", ["Passes %"] = "passesAccuracy",
        ["expected_goals"] = "expectedGoals", ["goals_prevented"] = "goalsPrevented",
    };

    public static void Upsert(Fixture fixture, IEnumerable<ApiFixtureTeamStatistics>? sources,
        IReadOnlyDictionary<int, Guid> teams)
    {
        var hasValues = false;
        foreach (var source in sources ?? [])
        {
            if (source.Team.Id is not { } extId || !teams.TryGetValue(extId, out var teamId) ||
                (teamId != fixture.HomeTeamId && teamId != fixture.AwayTeamId)) continue;
            foreach (var statistic in source.Statistics ?? [])
            {
                if (!Keys.TryGetValue(statistic.Type?.Trim() ?? "", out var key)) continue;
                var value = ParseValue(statistic.Value);
                // Missing/unavailable values must not erase a previously observed total.
                if (value is null) continue;
                var target = fixture.TeamStatistics.FirstOrDefault(s => s.TeamId == teamId && s.Key == key);
                if (target is null)
                {
                    target = new FixtureTeamStatistic { FixtureId = fixture.Id, TeamId = teamId, Key = key };
                    fixture.TeamStatistics.Add(target);
                }
                target.Value = value;
                hasValues = true;
            }
        }
        if (hasValues) fixture.TeamStatisticsUpdatedAt = DateTime.UtcNow;
    }

    private static decimal? ParseValue(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Number)
            return value.TryGetDecimal(out var number) ? number : null;
        if (value.ValueKind != JsonValueKind.String) return null;
        var text = value.GetString()?.Trim().TrimEnd('%').Trim();
        return decimal.TryParse(text, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint,
            CultureInfo.InvariantCulture, out var parsed) ? parsed : null;
    }

    public static async Task<MatchStatisticsDto?> ReadAsync(AppDbContext db, Guid id, CancellationToken ct)
    {
        var fixture = await db.Fixtures.AsNoTracking().Where(f => f.Id == id)
            .Select(f => new { f.HomeTeamId, f.AwayTeamId, f.TeamStatisticsUpdatedAt }).SingleOrDefaultAsync(ct);
        if (fixture is null) return null;
        var values = await db.FixtureTeamStatistics.AsNoTracking().Where(s => s.FixtureId == id)
            .Select(s => new { s.TeamId, s.Key, s.Value }).ToListAsync(ct);
        var rows = Keys.Values.Where(key => values.Any(s => s.Key == key))
            .Select(key => new MatchStatisticDto(key,
                values.FirstOrDefault(s => s.Key == key && s.TeamId == fixture.HomeTeamId)?.Value,
                values.FirstOrDefault(s => s.Key == key && s.TeamId == fixture.AwayTeamId)?.Value)).ToList();
        return new MatchStatisticsDto(fixture.TeamStatisticsUpdatedAt, rows);
    }
}
