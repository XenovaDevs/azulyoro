using Azulyoro.Domain.Entities;
using Azulyoro.Domain.Enums;
using Azulyoro.Infrastructure.ApiFootball;
using Azulyoro.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Azulyoro.Infrastructure.Sync;

/// <summary>
/// Incremental live-fixture ingestion. Pulls the API-Football fixture bundle,
/// upserts score/status/events, and reports whether the match has finished so
/// the poller can stop.
/// </summary>
public class LiveSyncService(
    AppDbContext db,
    IApiFootballClient api,
    ILogger<LiveSyncService> logger,
    IFixtureDetailSyncService? detailSync = null,
    IOptions<SportsSyncOptions>? options = null,
    LiveUpdateHub? updates = null,
    ISportsSyncService? sportsSync = null)
{
    private readonly LiveUpdateHub updates = updates ?? new();

    /// <summary>
    /// Poll today's and near-future Boca fixtures so a scheduled match can be
    /// observed changing to live without waiting for the 45-minute full sync.
    /// </summary>
    public async Task<int> PollOnceAsync(CancellationToken ct)
    {
        var syncOptions = options?.Value ?? new SportsSyncOptions();
        var now = DateTime.UtcNow;
        var live = await db.Fixtures.AsNoTracking()
            .Where(f => f.IsBoca &&
                f.DateUtc >= now.AddHours(-syncOptions.LiveLookbehindHours) &&
                f.DateUtc <= now.AddHours(Math.Clamp(syncOptions.LiveLookaheadHours, 0, 1)) &&
                f.Status != FixtureStatus.Finished &&
                f.Status != FixtureStatus.Cancelled &&
                f.Status != FixtureStatus.Abandoned &&
                f.Status != FixtureStatus.Awarded &&
                f.Status != FixtureStatus.WalkOver)
            .Select(f => new { f.Id, f.ExtId })
            .ToListAsync(ct);

        foreach (var fixture in live)
        {
            try
            {
                await SyncFixtureAsync(fixture.Id, fixture.ExtId, ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Live sync failed for fixture {Fixture}; retrying next tick.", fixture.ExtId);
            }
        }

        var otherCount = await PollOtherCompetitionFixturesAsync(now, syncOptions, ct);
        if (sportsSync is not null)
            await RefreshRecentStandingsAsync(now, syncOptions, ct);
        return live.Count + otherCount;
    }

    private async Task<int> PollOtherCompetitionFixturesAsync(DateTime now, SportsSyncOptions syncOptions, CancellationToken ct)
    {
        var trackedCompetitions = db.Fixtures.Where(f => f.IsBoca && f.Season!.IsCurrent)
            .Select(f => f.CompetitionId).Distinct();
        var fixtures = await db.Fixtures.Where(f => !f.IsBoca && f.Season!.IsCurrent &&
            trackedCompetitions.Contains(f.CompetitionId) &&
            f.DateUtc >= now.AddHours(-syncOptions.LiveLookbehindHours) && f.DateUtc <= now.AddMinutes(15) &&
            f.Status != FixtureStatus.Finished && f.Status != FixtureStatus.Cancelled &&
            f.Status != FixtureStatus.Abandoned && f.Status != FixtureStatus.Awarded && f.Status != FixtureStatus.WalkOver)
            .ToListAsync(ct);
        foreach (var batch in fixtures.Chunk(20))
        {
            try
            {
                var response = await api.GetAsync<ApiFixtureSyncItem>("fixtures",
                    new Dictionary<string, string?> { ["ids"] = string.Join("-", batch.Select(f => f.ExtId)) }, ct);
                foreach (var item in response.Response)
                {
                    var fixture = batch.FirstOrDefault(f => f.ExtId == item.Fixture.Id);
                    if (fixture is null) continue;
                    fixture.Status = FixtureStatusExtensions.FromApiShort(item.Fixture.Status.Short);
                    fixture.Elapsed = item.Fixture.Status.Elapsed;
                    fixture.HomeGoals = item.Goals.Home;
                    fixture.AwayGoals = item.Goals.Away;
                    fixture.FtHome = item.Score.Fulltime.Home;
                    fixture.FtAway = item.Score.Fulltime.Away;
                    fixture.HtHome = item.Score.Halftime.Home;
                    fixture.HtAway = item.Score.Halftime.Away;
                    fixture.ExtraTimeHome = item.Score.Extratime.Home;
                    fixture.ExtraTimeAway = item.Score.Extratime.Away;
                    fixture.PenaltyHome = item.Score.Penalty.Home;
                    fixture.PenaltyAway = item.Score.Penalty.Away;
                    if (item.Fixture.Date is not null) fixture.DateUtc = item.Fixture.Date.Value.UtcDateTime;
                    fixture.LastSyncedAt = now;
                }
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Competition live fixture batch failed; retrying next tick.");
            }
        }
        return fixtures.Count;
    }

    private async Task RefreshRecentStandingsAsync(DateTime now, SportsSyncOptions syncOptions, CancellationToken ct)
    {
        var trackedCompetitions = db.Fixtures.Where(f => f.IsBoca && f.Season!.IsCurrent)
            .Select(f => f.CompetitionId).Distinct();
        var completed = await db.Fixtures.AsNoTracking()
            .Where(f => trackedCompetitions.Contains(f.CompetitionId) && f.Status == FixtureStatus.Finished &&
                f.DateUtc >= now.AddHours(-syncOptions.StandingsRetryWindowHours))
            .Select(f => new { League = f.Competition!.ExtId, Year = f.Season!.Year, f.LastSyncedAt })
            .ToListAsync(ct);
        foreach (var competition in completed.GroupBy(f => new { f.League, f.Year }))
        {
            var resource = $"standings:{competition.Key.League}:{competition.Key.Year}";
            var state = await db.SyncStates.SingleOrDefaultAsync(s => s.Resource == resource, ct);
            if (state?.LastRunAt > now.AddSeconds(-syncOptions.StandingsRetryIntervalSeconds) &&
                state.LastRunAt >= competition.Max(f => f.LastSyncedAt)) continue;
            if (state is null)
            {
                state = new SyncState { Resource = resource };
                db.SyncStates.Add(state);
            }
            state.LastRunAt = DateTime.UtcNow;
            try
            {
                await sportsSync!.SyncCompetitionStandingsAsync(competition.Key.League, competition.Key.Year, ct);
                state.LastOkAt = now;
                state.LastError = null;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                db.ChangeTracker.Clear();
                state = await db.SyncStates.SingleOrDefaultAsync(s => s.Resource == resource, ct);
                if (state is null)
                {
                    state = new SyncState { Resource = resource };
                    db.SyncStates.Add(state);
                }
                state.LastRunAt = DateTime.UtcNow;
                state.LastError = ex.Message.Length > 2000 ? ex.Message[..2000] : ex.Message;
                logger.LogWarning(ex, "Post-match standings refresh failed for {Competition}; will retry.", competition.Key.League);
            }
            await db.SaveChangesAsync(ct);
        }
    }

    /// <summary>
    /// Pull one fixture and upsert its live state. Returns true when the match
    /// is finished (poller should stop for it).
    /// </summary>
    public async Task<bool> SyncFixtureAsync(Guid fixtureId, int extId, CancellationToken ct)
    {
        if (detailSync is not null)
        {
            await detailSync.SyncFixtureDetailAsync(fixtureId, extId, ct);
        }
        else
        {
            var response = await api.GetAsync<ApiFixtureItem>(
                "fixtures", new Dictionary<string, string?> { ["id"] = extId.ToString() }, ct);

            var item = response.Response.FirstOrDefault();
            if (item is null)
            {
                logger.LogWarning("Live sync: no payload for fixture ext_id {ExtId}.", extId);
                return false;
            }

            var fixtureToUpdate = await db.Fixtures
                .Include(f => f.Events)
                .Include(f => f.TeamStatistics)
                .FirstOrDefaultAsync(f => f.Id == fixtureId, ct);
            if (fixtureToUpdate is null)
            {
                return false;
            }

            fixtureToUpdate.Status = FixtureStatusExtensions.FromApiShort(item.Fixture.Status.Short);
            fixtureToUpdate.Elapsed = item.Fixture.Status.Elapsed;
            fixtureToUpdate.HomeGoals = item.Goals.Home;
            fixtureToUpdate.AwayGoals = item.Goals.Away;
            if (item.Fixture.Date is not null) fixtureToUpdate.DateUtc = item.Fixture.Date.Value.UtcDateTime;
            fixtureToUpdate.HtHome = item.Score.Halftime.Home;
            fixtureToUpdate.HtAway = item.Score.Halftime.Away;
            fixtureToUpdate.FtHome = item.Score.Fulltime.Home;
            fixtureToUpdate.FtAway = item.Score.Fulltime.Away;
            fixtureToUpdate.ExtraTimeHome = item.Score.Extratime.Home;
            fixtureToUpdate.ExtraTimeAway = item.Score.Extratime.Away;
            fixtureToUpdate.PenaltyHome = item.Score.Penalty.Home;
            fixtureToUpdate.PenaltyAway = item.Score.Penalty.Away;
            fixtureToUpdate.LastSyncedAt = DateTime.UtcNow;
            var teams = await db.Teams.ToDictionaryAsync(t => t.ExtId, t => t.Id, ct);
            MatchStatistics.Upsert(fixtureToUpdate, item.Statistics, teams);

            for (var seq = 0; seq < item.Events.Count; seq++)
            {
                var source = item.Events[seq];
                var target = fixtureToUpdate.Events.FirstOrDefault(e => e.ExtSeq == seq);
                if (target is null)
                {
                    target = new FixtureEvent { FixtureId = fixtureToUpdate.Id, ExtSeq = seq };
                    fixtureToUpdate.Events.Add(target);
                }

                target.Minute = source.Time.Elapsed;
                target.ExtraMinute = source.Time.Extra;
                target.Type = MapEventType(source.Type);
                target.Detail = source.Detail;
                target.Comments = source.Comments;
            }

            await db.SaveChangesAsync(ct);
        }

        var fixture = await db.Fixtures.AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == fixtureId, ct);
        if (fixture is null)
        {
            return false;
        }

        var events = await db.FixtureEvents.AsNoTracking()
            .Where(e => e.FixtureId == fixtureId)
            .OrderBy(e => e.ExtSeq)
            .Select(e => new LiveEventUpdate(
                e.Minute,
                e.ExtraMinute,
                e.Type.ToString(),
                e.Detail,
                db.Teams.Where(t => t.Id == e.TeamId).Select(t => t.Name).FirstOrDefault(),
                db.Players.Where(p => p.Id == e.PlayerId).Select(p => p.Name).FirstOrDefault(),
                db.Players.Where(p => p.Id == e.AssistPlayerId).Select(p => p.Name).FirstOrDefault()))
            .ToListAsync(ct);

        updates.Publish(new LiveFixtureUpdate(
            fixture.Id,
            fixture.Status.ToString(),
            fixture.Elapsed,
            fixture.HomeGoals,
            fixture.AwayGoals,
            events,
            await MatchStatistics.ReadAsync(db, fixtureId, ct)));

        var finished = fixture.Status.IsFinished();
        if (finished)
        {
            logger.LogInformation("Live sync: fixture {ExtId} reached final status; stopping polling.", extId);
        }
        return finished;
    }

    private static EventType MapEventType(string? apiType) => apiType?.ToLowerInvariant() switch
    {
        "goal" => EventType.Goal,
        "card" => EventType.Card,
        "subst" => EventType.Substitution,
        "var" => EventType.Var,
        _ => EventType.Other,
    };

    private static LiveEventUpdate MapEvent(ApiFixtureEvent source) => new(
        source.Time.Elapsed,
        source.Time.Extra,
        source.Type ?? "Other",
        source.Detail,
        source.Team.Name,
        source.Player.Name,
        source.Assist.Name);
}
