using System.Globalization;
using Azulyoro.Domain.Entities;
using Azulyoro.Domain.Enums;
using Azulyoro.Infrastructure.ApiFootball;
using Azulyoro.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Azulyoro.Infrastructure.Sync;

public interface IFixtureDetailSyncService
{
    Task<int> SyncFixtureDetailAsync(Guid fixtureId, int extId, CancellationToken ct);
    Task BackfillFinishedAsync(int max, CancellationToken ct);
}

/// <summary>
/// Syncs the per-fixture detail bundle (events, lineups, player stats) for a
/// single finished (or in-progress) fixture. The live sync only runs while a
/// match is in play, so finished matches would otherwise never receive their
/// lineups/player-stats. External calls complete before database writes.
/// Upserts are idempotent — re-running never duplicates rows.
/// </summary>
public sealed class FixtureDetailSyncService(
    AppDbContext db,
    IApiFootballClient api,
    ILogger<FixtureDetailSyncService> logger) : IFixtureDetailSyncService
{
    /// <summary>Delay between fixtures during a backfill to respect rate limits.</summary>
    private static readonly TimeSpan BackfillDelay = TimeSpan.FromMilliseconds(400);

    public async Task<int> SyncFixtureDetailAsync(Guid fixtureId, int extId, CancellationToken ct)
    {
        var response = await api.GetAsync<ApiFixtureItem>(
            "fixtures", new Dictionary<string, string?> { ["id"] = extId.ToString() }, ct);

        var item = response.Response.FirstOrDefault();
        if (item is null)
        {
            logger.LogWarning("Fixture-detail sync: no payload for fixture ext_id {ExtId}.", extId);
            return 0;
        }

        var fixture = await db.Fixtures
            .Include(f => f.Events)
            .Include(f => f.Lineups).ThenInclude(l => l.Players)
            .Include(f => f.PlayerStats)
            .FirstOrDefaultAsync(f => f.Id == fixtureId, ct);
        if (fixture is null)
        {
            return 0;
        }

        // Resolve teams (ext -> Guid). Any team we don't have is created on the fly.
        var teamsByExt = await db.Teams.ToDictionaryAsync(t => t.ExtId, t => t.Id, ct);

        foreach (var lineup in item.Lineups)
        {
            if (lineup.Team.Id is > 0 && !teamsByExt.ContainsKey(lineup.Team.Id.Value))
            {
                var team = new Team
                {
                    ExtId = lineup.Team.Id.Value,
                    Name = lineup.Team.Name ?? $"Team {lineup.Team.Id}",
                    IsTracked = false,
                };
                db.Teams.Add(team);
                teamsByExt[lineup.Team.Id.Value] = team.Id;
            }
        }

        // Ensure every referenced player exists so names resolve. Opponent
        // players are created inactive with no team; the tracked team's players
        // keep their own team assignment (we never touch TeamId here).
        var playersByExt = await EnsurePlayersAsync(item, ct);

        // ── Update fixture header ────────────────────────────────────────────
        fixture.Status = FixtureStatusExtensions.FromApiShort(item.Fixture.Status.Short);
        fixture.Elapsed = item.Fixture.Status.Elapsed;
        fixture.HomeGoals = item.Goals.Home;
        fixture.AwayGoals = item.Goals.Away;
        fixture.LastSyncedAt = DateTime.UtcNow;

        var eventCount = UpsertEvents(fixture, item, teamsByExt, playersByExt);
        UpsertLineups(fixture, item, teamsByExt, playersByExt);
        UpsertPlayerStats(fixture, item, teamsByExt, playersByExt);

        await db.SaveChangesAsync(ct);
        return eventCount;
    }

    public async Task BackfillFinishedAsync(int max, CancellationToken ct)
    {
        if (max < 1)
        {
            return;
        }

        // Post-materialization filter for finished statuses (IsFinished is an
        // extension method, not translatable to SQL), then target any fixture
        // that lacks lineups, lacks events, or has events without resolved player names.
        var candidates = await db.Fixtures.AsNoTracking()
            .Where(f => f.IsBoca && (
                !db.FixtureLineups.Any(l => l.FixtureId == f.Id) ||
                !db.FixtureEvents.Any(e => e.FixtureId == f.Id) ||
                db.FixtureEvents.Any(e => e.FixtureId == f.Id && e.PlayerName == null && e.PlayerId == null)))
            .OrderByDescending(f => f.DateUtc)
            .Select(f => new { f.Id, f.ExtId, f.Status })
            .ToListAsync(ct);

        var targets = candidates
            .Where(f => f.Status.IsFinished())
            .Take(max)
            .ToList();

        logger.LogInformation(
            "Fixture-detail backfill: {Count} finished fixtures needing details/lineups (cap {Max}).",
            targets.Count, max);

        foreach (var target in targets)
        {
            ct.ThrowIfCancellationRequested();
            await SyncFixtureDetailAsync(target.Id, target.ExtId, ct);
            db.ChangeTracker.Clear();
            await Task.Delay(BackfillDelay, ct);
        }
    }

    /// <summary>
    /// Build a players-by-extId dictionary and create minimal rows for any
    /// player referenced in events/lineups/stats that we don't have yet.
    /// </summary>
    private async Task<Dictionary<int, Guid>> EnsurePlayersAsync(
        ApiFixtureItem item, CancellationToken ct)
    {
        var referenced = new Dictionary<int, string?>();

        void Note(int? id, string? name)
        {
            if (id is > 0 && !referenced.ContainsKey(id.Value))
            {
                referenced[id.Value] = name;
            }
        }

        foreach (var ev in item.Events)
        {
            Note(ev.Player.Id, ev.Player.Name);
            Note(ev.Assist.Id, ev.Assist.Name);
        }

        foreach (var lineup in item.Lineups)
        {
            foreach (var slot in lineup.StartXI.Concat(lineup.Substitutes))
            {
                Note(slot.Player.Id, slot.Player.Name);
            }
        }

        foreach (var teamPlayers in item.Players)
        {
            foreach (var entry in teamPlayers.Players)
            {
                Note(entry.Player.Id, entry.Player.Name);
            }
        }

        var extIds = referenced.Keys.ToArray();
        var existing = await db.Players
            .Where(p => extIds.Contains(p.ExtId))
            .ToListAsync(ct);
        var byExt = existing.ToDictionary(p => p.ExtId, p => p.Id);

        foreach (var (extId, name) in referenced)
        {
            if (byExt.ContainsKey(extId))
            {
                continue;
            }

            var player = new Player
            {
                ExtId = extId,
                Name = name ?? $"#{extId}",
                IsActive = false,
            };
            db.Players.Add(player);
            byExt[extId] = player.Id;
        }

        return byExt;
    }

    private static int UpsertEvents(
        Fixture fixture,
        ApiFixtureItem item,
        IReadOnlyDictionary<int, Guid> teams,
        IReadOnlyDictionary<int, Guid> players)
    {
        for (var seq = 0; seq < item.Events.Count; seq++)
        {
            var source = item.Events[seq];
            var target = fixture.Events.FirstOrDefault(e => e.ExtSeq == seq);
            if (target is null)
            {
                target = new FixtureEvent { FixtureId = fixture.Id, ExtSeq = seq };
                fixture.Events.Add(target);
            }

            target.Minute = source.Time.Elapsed;
            target.ExtraMinute = source.Time.Extra;
            target.TeamId = ResolveNullable(teams, source.Team.Id);
            target.TeamName = source.Team.Name;
            target.PlayerId = ResolveNullable(players, source.Player.Id);
            target.PlayerName = source.Player.Name;
            target.AssistPlayerId = ResolveNullable(players, source.Assist.Id);
            target.AssistName = source.Assist.Name;
            target.Type = MapEventType(source.Type);
            target.Detail = source.Detail;
            target.Comments = source.Comments;
        }

        return item.Events.Count;
    }

    private void UpsertLineups(
        Fixture fixture,
        ApiFixtureItem item,
        IReadOnlyDictionary<int, Guid> teams,
        IReadOnlyDictionary<int, Guid> players)
    {
        foreach (var source in item.Lineups)
        {
            var teamId = ResolveNullable(teams, source.Team.Id);
            if (teamId is null)
            {
                logger.LogWarning(
                    "Fixture-detail sync: lineup team ext_id {TeamExtId} not found; skipping.",
                    source.Team.Id);
                continue;
            }

            var lineup = fixture.Lineups.FirstOrDefault(l => l.TeamId == teamId.Value);
            if (lineup is null)
            {
                lineup = new FixtureLineup { FixtureId = fixture.Id, TeamId = teamId.Value };
                fixture.Lineups.Add(lineup);
            }

            lineup.Formation = source.Formation;
            lineup.CoachName = source.Coach.Name;

            // Idempotency: rebuild the player list from scratch on every run.
            lineup.Players.Clear();

            AddLineupPlayers(lineup, source.StartXI, players, isStarter: true);
            AddLineupPlayers(lineup, source.Substitutes, players, isStarter: false);
        }
    }

    private static void AddLineupPlayers(
        FixtureLineup lineup,
        IEnumerable<ApiLineupSlot> slots,
        IReadOnlyDictionary<int, Guid> players,
        bool isStarter)
    {
        foreach (var slot in slots)
        {
            var playerId = ResolveNullable(players, slot.Player.Id);
            if (playerId is null)
            {
                continue;
            }

            lineup.Players.Add(new FixtureLineupPlayer
            {
                LineupId = lineup.Id,
                PlayerId = playerId.Value,
                IsStarter = isStarter,
                Grid = slot.Player.Grid,
                Number = slot.Player.Number,
            });
        }
    }

    private void UpsertPlayerStats(
        Fixture fixture,
        ApiFixtureItem item,
        IReadOnlyDictionary<int, Guid> teams,
        IReadOnlyDictionary<int, Guid> players)
    {
        foreach (var teamPlayers in item.Players)
        {
            var teamId = ResolveNullable(teams, teamPlayers.Team.Id);
            foreach (var entry in teamPlayers.Players)
            {
                var playerId = ResolveNullable(players, entry.Player.Id);
                if (playerId is null)
                {
                    continue;
                }

                var stat = entry.Statistics.FirstOrDefault();
                if (stat is null)
                {
                    continue;
                }

                var target = fixture.PlayerStats.FirstOrDefault(s => s.PlayerId == playerId.Value);
                if (target is null)
                {
                    target = new FixturePlayerStats
                    {
                        FixtureId = fixture.Id,
                        PlayerId = playerId.Value,
                    };
                    fixture.PlayerStats.Add(target);
                }

                target.TeamId = teamId ?? target.TeamId;
                target.Minutes = stat.Games.Minutes;
                target.Rating = ParseDecimal(stat.Games.Rating);
                target.Goals = stat.Goals.Total ?? 0;
                target.Assists = stat.Goals.Assists ?? 0;
                target.ShotsTotal = stat.Shots.Total ?? 0;
                target.ShotsOn = stat.Shots.On ?? 0;
                target.Passes = stat.Passes.Total ?? 0;
                target.PassesAccuracy = ParseInt(stat.Passes.Accuracy);
                target.Tackles = stat.Tackles.Total ?? 0;
                target.Yellow = stat.Cards.Yellow ?? 0;
                target.Red = stat.Cards.Red ?? 0;
            }
        }
    }

    private static Guid? ResolveNullable(IReadOnlyDictionary<int, Guid> map, int? extId) =>
        extId is > 0 && map.TryGetValue(extId.Value, out var id) ? id : null;

    private static decimal? ParseDecimal(string? value) =>
        decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var parsed)
            ? parsed
            : null;

    private static int? ParseInt(string? value) =>
        int.TryParse(
            value?.Replace("%", string.Empty).Trim(),
            NumberStyles.Any,
            CultureInfo.InvariantCulture,
            out var parsed)
            ? parsed
            : null;

    private static EventType MapEventType(string? apiType) => apiType?.ToLowerInvariant() switch
    {
        "goal" => EventType.Goal,
        "card" => EventType.Card,
        "subst" => EventType.Substitution,
        "var" => EventType.Var,
        _ => EventType.Other,
    };
}
