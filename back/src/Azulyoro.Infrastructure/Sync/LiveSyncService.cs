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
    LiveUpdateHub? updates = null)
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
                f.DateUtc <= now.AddHours(syncOptions.LiveLookaheadHours) &&
                f.Status != FixtureStatus.Finished &&
                f.Status != FixtureStatus.Cancelled &&
                f.Status != FixtureStatus.Abandoned &&
                f.Status != FixtureStatus.Awarded &&
                f.Status != FixtureStatus.WalkOver)
            .Select(f => new { f.Id, f.ExtId })
            .ToListAsync(ct);

        foreach (var fixture in live)
        {
            await SyncFixtureAsync(fixture.Id, fixture.ExtId, ct);
        }

        return live.Count;
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
                .FirstOrDefaultAsync(f => f.Id == fixtureId, ct);
            if (fixtureToUpdate is null)
            {
                return false;
            }

            fixtureToUpdate.Status = FixtureStatusExtensions.FromApiShort(item.Fixture.Status.Short);
            fixtureToUpdate.Elapsed = item.Fixture.Status.Elapsed;
            fixtureToUpdate.HomeGoals = item.Goals.Home;
            fixtureToUpdate.AwayGoals = item.Goals.Away;
            fixtureToUpdate.LastSyncedAt = DateTime.UtcNow;

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
            events));

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
