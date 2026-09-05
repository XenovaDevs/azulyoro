using System.Text.RegularExpressions;
using Azulyoro.Domain.Entities;
using Azulyoro.Domain.Enums;

namespace Azulyoro.Infrastructure.Sync;

/// <summary>Read-side reconciliation against an exact, already-counted fixture prefix.
/// Provider points adjustments are preserved and playoff results never earn league points.</summary>
public static partial class StandingsReconciler
{
    public sealed record Row(Standing Standing, string Phase, DateTime? UpdatedAt, bool IsProvisional);

    public static string Phase(string? label)
    {
        var value = (label ?? "").ToLowerInvariant();
        if (value.Contains("apertura")) return "apertura";
        if (value.Contains("clausura")) return "clausura";
        if (value.Contains("aggregate") || value.Contains("annual") || value.Contains("anual")) return "annual";
        if (value.Contains("group") || value.Contains("grupo") || value.Contains("zona")) return "groups";
        return "league";
    }

    public static bool IsTableRound(string? round, string phase)
    {
        if (string.IsNullOrWhiteSpace(round) || KnockoutRound().IsMatch(round)) return false;
        var fixturePhase = Phase(round);
        if (phase == "annual") return fixturePhase is "apertura" or "clausura";
        return fixturePhase == phase && (phase != "league" || RegularRound().IsMatch(round));
    }

    public static IReadOnlyList<Row> Reconcile(IReadOnlyList<Standing> standings, IReadOnlyList<Fixture> fixtures)
    {
        var result = new List<Row>();
        foreach (var source in standings)
        {
            var phase = Phase(source.GroupName);
            var row = Clone(source);
            var updated = source.SourceUpdatedAtUtc;
            var provisional = false;
            var games = fixtures.Where(f => f.CompetitionId == source.CompetitionId && f.SeasonId == source.SeasonId &&
                    (f.HomeTeamId == source.TeamId || f.AwayTeamId == source.TeamId) && IsTableRound(f.Round, phase) &&
                    (f.Status == FixtureStatus.Finished || f.Status.IsLive()) && f.HomeGoals.HasValue && f.AwayGoals.HasValue)
                .DistinctBy(f => f.ExtId).OrderBy(f => f.DateUtc).ThenBy(f => f.ExtId).ToList();

            // Matching every statistic identifies which results the snapshot already counts.
            var counted = new Standing { TeamId = source.TeamId };
            foreach (var game in games.Take(source.Played)) Apply(counted, game);
            var prefix = games.Take(source.Played).ToList();
            var matchesSnapshot = SameRecord(counted, source);
            if (!matchesSnapshot && TryReplaceLastCountedResult(row, source, prefix))
            {
                matchesSnapshot = true;
                updated = Latest(updated, prefix[^1].LastSyncedAt);
                provisional = true;
            }
            if (games.Count > source.Played && prefix.All(f => f.Status == FixtureStatus.Finished) && matchesSnapshot)
            {
                foreach (var game in games.Skip(source.Played))
                {
                    Apply(row, game);
                    updated = Latest(updated, game.LastSyncedAt);
                    provisional = true;
                }
            }
            result.Add(new Row(row, phase, updated, provisional));
        }

        AddAnnualTables(result);
        return result.GroupBy(r => (r.Standing.CompetitionId, r.Standing.SeasonId, r.Standing.GroupName))
            .SelectMany(group => Order(group).Select((row, index) =>
            {
                row.Standing.Rank = index + 1;
                return row;
            })).ToList();
    }

    private static bool SameRecord(Standing left, Standing right) =>
        left.Played == right.Played && left.Win == right.Win && left.Draw == right.Draw &&
        left.Lose == right.Lose && left.GoalsFor == right.GoalsFor && left.GoalsAgainst == right.GoalsAgainst;

    private static bool TryReplaceLastCountedResult(Standing row, Standing source, IReadOnlyList<Fixture> prefix)
    {
        if (source.Played < 1 || prefix.Count != source.Played || source.SourceUpdatedAtUtc is null) return false;
        var last = prefix[^1];
        // An official table may already include an earlier in-play score. Only a
        // snapshot observed during that match can be replaced; old final results
        // and newer official corrections remain authoritative.
        if (last.LastSyncedAt is null || last.LastSyncedAt <= source.SourceUpdatedAtUtc ||
            source.SourceUpdatedAtUtc < last.DateUtc || source.SourceUpdatedAtUtc > last.DateUtc.AddHours(6) ||
            prefix.Take(prefix.Count - 1).Any(f => f.Status != FixtureStatus.Finished)) return false;

        var prior = new Standing { TeamId = source.TeamId };
        foreach (var game in prefix.Take(prefix.Count - 1)) Apply(prior, game);
        var scored = source.GoalsFor - prior.GoalsFor;
        var conceded = source.GoalsAgainst - prior.GoalsAgainst;
        var win = source.Win - prior.Win;
        var draw = source.Draw - prior.Draw;
        var lose = source.Lose - prior.Lose;
        if (scored < 0 || conceded < 0 || win != (scored > conceded ? 1 : 0) ||
            draw != (scored == conceded ? 1 : 0) || lose != (scored < conceded ? 1 : 0)) return false;

        // Subtract only the proven prior result, preserving any provider points
        // deductions. Apply adds the current score without changing matches played.
        row.Played--;
        row.Win -= win;
        row.Draw -= draw;
        row.Lose -= lose;
        row.GoalsFor -= scored;
        row.GoalsAgainst -= conceded;
        row.Points -= win * 3 + draw;
        if (!string.IsNullOrEmpty(row.Form)) row.Form = row.Form[..^1];
        Apply(row, last);
        return true;
    }

    private static void AddAnnualTables(List<Row> rows)
    {
        foreach (var competition in rows.ToList().GroupBy(r => (r.Standing.CompetitionId, r.Standing.SeasonId)))
        {
            if (competition.First().Standing.Competition?.ExtId != 128 || competition.Any(r => r.Phase == "annual")) continue;
            var apertura = competition.Where(r => r.Phase == "apertura").ToList();
            var clausura = competition.Where(r => r.Phase == "clausura").ToList();
            // Only combine two explicit, disjoint league phases with one row per team.
            if (apertura.Count == 0 || clausura.Count == 0 ||
                apertura.DistinctBy(r => r.Standing.TeamId).Count() != apertura.Count ||
                clausura.DistinctBy(r => r.Standing.TeamId).Count() != clausura.Count ||
                !apertura.Select(r => r.Standing.TeamId).ToHashSet().SetEquals(clausura.Select(r => r.Standing.TeamId))) continue;
            var closing = clausura.ToDictionary(r => r.Standing.TeamId);
            foreach (var opening in apertura)
            {
                var end = closing[opening.Standing.TeamId];
                var sum = Clone(end.Standing);
                sum.GroupName = "Tabla Anual";
                sum.Points += opening.Standing.Points;
                sum.Played += opening.Standing.Played;
                sum.Win += opening.Standing.Win;
                sum.Draw += opening.Standing.Draw;
                sum.Lose += opening.Standing.Lose;
                sum.GoalsFor += opening.Standing.GoalsFor;
                sum.GoalsAgainst += opening.Standing.GoalsAgainst;
                sum.GoalsDiff = sum.GoalsFor - sum.GoalsAgainst;
                var oldest = opening.UpdatedAt is null || end.UpdatedAt is null ? (DateTime?)null
                    : opening.UpdatedAt < end.UpdatedAt ? opening.UpdatedAt : end.UpdatedAt;
                rows.Add(new Row(sum, "annual", oldest, opening.IsProvisional || end.IsProvisional));
            }
        }
    }

    private static IOrderedEnumerable<Row> Order(IEnumerable<Row> rows)
    {
        // Argentina uses goal difference/goals scored. Preserve the provider's
        // tie-break ranking for other tournaments (e.g. CONMEBOL head-to-head).
        var argentina = rows.First().Standing.Competition?.Country == "Argentina";
        var ordered = rows.OrderByDescending(r => r.Standing.Points);
        if (argentina) ordered = ordered.ThenByDescending(r => r.Standing.GoalsDiff).ThenByDescending(r => r.Standing.GoalsFor);
        return ordered.ThenBy(r => r.Standing.Rank).ThenBy(r => r.Standing.TeamId);
    }

    private static void Apply(Standing row, Fixture game)
    {
        var home = game.HomeTeamId == row.TeamId;
        var scored = (home ? game.HomeGoals : game.AwayGoals)!.Value;
        var conceded = (home ? game.AwayGoals : game.HomeGoals)!.Value;
        row.Played++;
        row.GoalsFor += scored;
        row.GoalsAgainst += conceded;
        row.GoalsDiff = row.GoalsFor - row.GoalsAgainst;
        var form = scored > conceded ? "W" : scored == conceded ? "D" : "L";
        if (scored > conceded) { row.Win++; row.Points += 3; }
        else if (scored == conceded) { row.Draw++; row.Points++; }
        else row.Lose++;
        row.Form = (row.Form + form);
        if (row.Form.Length > 5) row.Form = row.Form[^5..];
    }

    private static DateTime? Latest(DateTime? left, DateTime? right) =>
        left is null ? right : right is null || left >= right ? left : right;

    private static Standing Clone(Standing row) => new()
    {
        Id = row.Id, CompetitionId = row.CompetitionId, Competition = row.Competition,
        SeasonId = row.SeasonId, TeamId = row.TeamId, Team = row.Team, GroupName = row.GroupName,
        Rank = row.Rank, Points = row.Points, Played = row.Played, Win = row.Win, Draw = row.Draw,
        Lose = row.Lose, GoalsFor = row.GoalsFor, GoalsAgainst = row.GoalsAgainst,
        GoalsDiff = row.GoalsDiff, Form = row.Form, SourceUpdatedAtUtc = row.SourceUpdatedAtUtc,
    };

    [GeneratedRegex(@"round of|final|play.?off|octavos|cuartos|semi|relegation|promotion|qualif|preliminary", RegexOptions.IgnoreCase)]
    private static partial Regex KnockoutRound();
    [GeneratedRegex(@"regular season|matchday|^\d+$|^round\s*-?\s*\d+$", RegexOptions.IgnoreCase)]
    private static partial Regex RegularRound();
}
