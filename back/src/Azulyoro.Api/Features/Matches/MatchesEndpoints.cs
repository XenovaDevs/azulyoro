using System.Text;
using System.Text.Json;
using Azulyoro.Api.Common;
using Azulyoro.Domain.Enums;
using Azulyoro.Infrastructure.Persistence;
using Azulyoro.Infrastructure.Sync;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.EntityFrameworkCore;

namespace Azulyoro.Api.Features.Matches;

public static class MatchesEndpoints
{
    public static IEndpointRouteBuilder MapMatchesEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/matches");

        group.MapGet("/", GetMatches);
        group.MapGet("/next", GetNext);
        group.MapGet("/live", GetLive);
        group.MapGet("/{id:guid}/stream", StreamLive);
        group.MapGet("/{id:guid}", GetById);
        group.MapGet("/{id:guid}/events", GetEvents);
        group.MapGet("/{id:guid}/lineups", GetLineups);
        group.MapGet("/{id:guid}/player-stats", GetPlayerStats);

        return app;
    }

    private static async Task<IResult> GetMatches(
        HttpContext http,
        AppDbContext db,
        CancellationToken ct,
        string? status = null,
        Guid? competitionId = null,
        DateTime? from = null,
        DateTime? to = null,
        int page = 1,
        int pageSize = 20)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;
        if (pageSize > 50) pageSize = 50;

        var query = db.Fixtures.AsNoTracking().Where(f => f.IsBoca);

        bool upcoming = false;
        if (!string.IsNullOrWhiteSpace(status))
        {
            switch (status.Trim().ToLowerInvariant())
            {
                case "upcoming":
                    upcoming = true;
                    query = query.Where(f => f.Status == FixtureStatus.NotStarted);
                    break;
                case "finished":
                    query = query.Where(f =>
                        f.Status == FixtureStatus.Finished ||
                        f.Status == FixtureStatus.Cancelled ||
                        f.Status == FixtureStatus.Abandoned ||
                        f.Status == FixtureStatus.Awarded ||
                        f.Status == FixtureStatus.WalkOver);
                    break;
                case "live":
                    query = query.Where(f =>
                        f.Status == FixtureStatus.FirstHalf ||
                        f.Status == FixtureStatus.HalfTime ||
                        f.Status == FixtureStatus.SecondHalf ||
                        f.Status == FixtureStatus.ExtraTime ||
                        f.Status == FixtureStatus.BreakTime ||
                        f.Status == FixtureStatus.Penalty);
                    break;
                default:
                    return Results.Problem(
                        detail: "status must be one of: upcoming, finished, live.",
                        statusCode: StatusCodes.Status400BadRequest);
            }
        }

        if (competitionId is { } cid)
            query = query.Where(f => f.CompetitionId == cid);
        if (from is { } fromUtc)
            query = query.Where(f => f.DateUtc >= fromUtc);
        if (to is { } toUtc)
            query = query.Where(f => f.DateUtc <= toUtc);

        var total = await query.CountAsync(ct);

        query = upcoming
            ? query.OrderBy(f => f.DateUtc)
            : query.OrderByDescending(f => f.DateUtc);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(f => new MatchDto(
                f.Id,
                f.ExtId,
                f.DateUtc,
                f.Status.ToString(),
                f.CompetitionId,
                f.Competition!.Name,
                f.HomeTeamId,
                f.HomeTeam!.Name,
                f.HomeTeam.LogoUrl,
                f.AwayTeamId,
                f.AwayTeam!.Name,
                f.AwayTeam.LogoUrl,
                f.HomeGoals,
                f.AwayGoals,
                f.IsBoca))
            .ToListAsync(ct);

        CacheControl.SetPublicMaxAge(http, 60);
        return Results.Ok(new PagedResult<MatchDto>(items, page, pageSize, total));
    }

    private static async Task<IResult> GetNext(HttpContext http, AppDbContext db, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var match = await db.Fixtures.AsNoTracking()
            .Where(f => f.IsBoca && f.Status == FixtureStatus.NotStarted && f.DateUtc >= now)
            .OrderBy(f => f.DateUtc)
            .Select(f => new MatchDto(
                f.Id, f.ExtId, f.DateUtc, f.Status.ToString(),
                f.CompetitionId, f.Competition!.Name,
                f.HomeTeamId, f.HomeTeam!.Name, f.HomeTeam.LogoUrl,
                f.AwayTeamId, f.AwayTeam!.Name, f.AwayTeam.LogoUrl,
                f.HomeGoals, f.AwayGoals, f.IsBoca))
            .FirstOrDefaultAsync(ct);

        CacheControl.SetNoStore(http);
        return match is null
            ? Results.NotFound()
            : Results.Ok(match);
    }

    private static async Task<IResult> GetLive(
        HttpContext http,
        AppDbContext db,
        IMemoryCache cache,
        CancellationToken ct)
    {
        var items = await cache.GetOrCreateAsync("matches:live", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(2);
            return await db.Fixtures.AsNoTracking()
                .Where(f => f.IsBoca && (
                    f.Status == FixtureStatus.FirstHalf ||
                    f.Status == FixtureStatus.HalfTime ||
                    f.Status == FixtureStatus.SecondHalf ||
                    f.Status == FixtureStatus.ExtraTime ||
                    f.Status == FixtureStatus.BreakTime ||
                    f.Status == FixtureStatus.Penalty))
                .OrderByDescending(f => f.DateUtc)
                .Select(f => new MatchDto(
                    f.Id, f.ExtId, f.DateUtc, f.Status.ToString(),
                    f.CompetitionId, f.Competition!.Name,
                    f.HomeTeamId, f.HomeTeam!.Name, f.HomeTeam.LogoUrl,
                    f.AwayTeamId, f.AwayTeam!.Name, f.AwayTeam.LogoUrl,
                    f.HomeGoals, f.AwayGoals, f.IsBoca))
                .ToListAsync(ct);
        }) ?? [];

        CacheControl.SetPublicMaxAge(http, 2);
        return items.Count == 0
            ? Results.NoContent()
            : Results.Ok(items);
    }

    private static readonly JsonSerializerOptions SseJsonOptions = new(JsonSerializerDefaults.Web);

    private static async Task StreamLive(
        HttpContext http,
        AppDbContext db,
        LiveUpdateHub hub,
        Guid id,
        CancellationToken ct)
    {
        await using var subscription = hub.Subscribe(id);
        var initial = await ReadLiveUpdateAsync(db, id, ct);
        if (initial is null)
        {
            http.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        http.Response.StatusCode = StatusCodes.Status200OK;
        http.Response.ContentType = "text/event-stream";
        http.Response.Headers.CacheControl = "no-cache, no-transform";
        http.Response.Headers["X-Accel-Buffering"] = "no";
        http.Response.Headers.Connection = "keep-alive";
        await http.Response.StartAsync(ct);

        await using var writer = new StreamWriter(
            http.Response.Body,
            new UTF8Encoding(encoderShouldEmitUTF8Identifier: false),
            bufferSize: 1024,
            leaveOpen: true)
        {
            NewLine = "\n",
        };

        await writer.WriteAsync("retry: 5000\n\n");
        await WriteSseAsync(writer, initial, ct);
        if (IsFinished(initial.Status))
        {
            return;
        }

        // ChannelReader's ReadAllAsync enumerator does not implement disposal;
        // the subscription itself completes and removes the channel below.
        var updates = subscription.ReadAllAsync(ct).GetAsyncEnumerator(ct);
        while (!ct.IsCancellationRequested)
        {
            var nextUpdate = updates.MoveNextAsync().AsTask();
            var heartbeat = Task.Delay(TimeSpan.FromSeconds(15), ct);
            var completed = await Task.WhenAny(nextUpdate, heartbeat);

            if (completed == heartbeat)
            {
                await writer.WriteAsync(": keep-alive\n\n");
                await writer.FlushAsync(ct);
                continue;
            }

            if (!await nextUpdate)
            {
                break;
            }

            await WriteSseAsync(writer, updates.Current, ct);
            if (IsFinished(updates.Current.Status))
            {
                break;
            }
        }
    }

    private static async Task<LiveFixtureUpdate?> ReadLiveUpdateAsync(
        AppDbContext db,
        Guid id,
        CancellationToken ct)
    {
        var fixture = await db.Fixtures.AsNoTracking()
            .Where(f => f.Id == id && f.IsBoca)
            .Select(f => new LiveFixtureUpdate(
                f.Id,
                f.Status.ToString(),
                f.Elapsed,
                f.HomeGoals,
                f.AwayGoals,
                Array.Empty<LiveEventUpdate>()))
            .FirstOrDefaultAsync(ct);

        if (fixture is null)
        {
            return null;
        }

        var events = await db.FixtureEvents.AsNoTracking()
            .Where(e => e.FixtureId == id)
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

        return fixture with { Events = events };
    }

    private static Task WriteSseAsync(
        StreamWriter writer,
        LiveFixtureUpdate update,
        CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(update, SseJsonOptions);
        return WriteSseCoreAsync(writer, json, ct);
    }

    private static async Task WriteSseCoreAsync(
        StreamWriter writer,
        string json,
        CancellationToken ct)
    {
        await writer.WriteAsync("data: ");
        await writer.WriteLineAsync(json);
        await writer.WriteLineAsync();
        await writer.FlushAsync(ct);
    }

    private static bool IsFinished(string status) =>
        Enum.TryParse<FixtureStatus>(status, ignoreCase: true, out var parsed) &&
        parsed.IsFinished();

    private static async Task<IResult> GetById(HttpContext http, AppDbContext db, Guid id, CancellationToken ct)
    {
        var match = await db.Fixtures.AsNoTracking()
            .Where(f => f.Id == id)
            .Select(f => new MatchDetailDto(
                f.Id, f.ExtId, f.DateUtc, f.Status.ToString(),
                f.CompetitionId, f.Competition!.Name,
                f.HomeTeamId, f.HomeTeam!.Name, f.HomeTeam.LogoUrl,
                f.AwayTeamId, f.AwayTeam!.Name, f.AwayTeam.LogoUrl,
                f.HomeGoals, f.AwayGoals, f.IsBoca,
                f.VenueName, f.Round, f.HtHome, f.HtAway, f.FtHome, f.FtAway, f.Elapsed))
            .FirstOrDefaultAsync(ct);

        if (match is null)
            return Results.NotFound();

        CacheControl.SetPublicMaxAge(http, 60);
        return Results.Ok(match);
    }

    private static async Task<IResult> GetEvents(
        HttpContext http,
        AppDbContext db,
        IFixtureDetailSyncService detailSync,
        Guid id,
        CancellationToken ct)
    {
        var fixture = await db.Fixtures.AsNoTracking()
            .Where(f => f.Id == id)
            .Select(f => new { f.Id, f.ExtId, f.Status })
            .FirstOrDefaultAsync(ct);
        if (fixture is null)
            return Results.NotFound();

        var events = await QueryEventsAsync(db, id, ct);
        if ((events.Count == 0 || events.All(e => e.PlayerName == null)) &&
            fixture.Status != FixtureStatus.NotStarted &&
            fixture.ExtId > 0)
        {
            try
            {
                await detailSync.SyncFixtureDetailAsync(fixture.Id, fixture.ExtId, ct);
                events = await QueryEventsAsync(db, id, ct);
            }
            catch
            {
                // Best-effort fallback
            }
        }

        CacheControl.SetPublicMaxAge(http, 60);
        return Results.Ok(events);
    }

    private static async Task<IResult> GetLineups(
        HttpContext http,
        AppDbContext db,
        IFixtureDetailSyncService detailSync,
        Guid id,
        CancellationToken ct)
    {
        var fixture = await db.Fixtures.AsNoTracking()
            .Where(f => f.Id == id)
            .Select(f => new { f.Id, f.ExtId, f.Status })
            .FirstOrDefaultAsync(ct);
        if (fixture is null)
            return Results.NotFound();

        var lineups = await QueryLineupsAsync(db, id, ct);
        if (lineups.Count == 0 &&
            fixture.Status != FixtureStatus.NotStarted &&
            fixture.ExtId > 0)
        {
            try
            {
                await detailSync.SyncFixtureDetailAsync(fixture.Id, fixture.ExtId, ct);
                lineups = await QueryLineupsAsync(db, id, ct);
            }
            catch
            {
                // Best-effort fallback
            }
        }

        CacheControl.SetPublicMaxAge(http, 60);
        return Results.Ok(lineups);
    }

    private static Task<List<EventDto>> QueryEventsAsync(AppDbContext db, Guid id, CancellationToken ct) =>
        db.FixtureEvents.AsNoTracking()
            .Where(e => e.FixtureId == id)
            .OrderBy(e => e.ExtSeq)
            .Select(e => new EventDto(
                e.Minute, e.ExtraMinute, e.Type.ToString(), e.Detail,
                e.TeamId,
                e.TeamName ?? db.Teams.Where(t => t.Id == e.TeamId).Select(t => t.Name).FirstOrDefault(),
                e.PlayerId,
                e.PlayerName ?? db.Players.Where(p => p.Id == e.PlayerId).Select(p => p.Name).FirstOrDefault(),
                db.Players.Where(p => p.Id == e.PlayerId || (e.PlayerName != null && p.Name == e.PlayerName)).Select(p => p.PhotoUrl).FirstOrDefault(),
                e.AssistPlayerId,
                e.AssistName ?? db.Players.Where(p => p.Id == e.AssistPlayerId).Select(p => p.Name).FirstOrDefault(),
                db.Players.Where(p => p.Id == e.AssistPlayerId || (e.AssistName != null && p.Name == e.AssistName)).Select(p => p.PhotoUrl).FirstOrDefault()))
            .ToListAsync(ct);

    private static Task<List<LineupDto>> QueryLineupsAsync(AppDbContext db, Guid id, CancellationToken ct) =>
        db.FixtureLineups.AsNoTracking()
            .Where(l => l.FixtureId == id)
            .Select(l => new LineupDto(
                l.TeamId,
                db.Teams.Where(t => t.Id == l.TeamId).Select(t => t.Name).FirstOrDefault(),
                l.Formation,
                l.CoachName,
                l.Players
                    .OrderByDescending(p => p.IsStarter)
                    .ThenBy(p => p.Number)
                    .Select(p => new LineupPlayerDto(
                        p.PlayerId,
                        db.Players.Where(pl => pl.Id == p.PlayerId).Select(pl => pl.Name).FirstOrDefault(),
                        db.Players.Where(pl => pl.Id == p.PlayerId).Select(pl => pl.PhotoUrl).FirstOrDefault(),
                        p.IsStarter, p.Grid, p.Number))
                    .ToList()))
            .ToListAsync(ct);

    private static async Task<IResult> GetPlayerStats(HttpContext http, AppDbContext db, Guid id, CancellationToken ct)
    {
        var exists = await db.Fixtures.AsNoTracking().AnyAsync(f => f.Id == id, ct);
        if (!exists)
            return Results.NotFound();

        var stats = await db.FixturePlayerStats.AsNoTracking()
            .Where(s => s.FixtureId == id)
            .Select(s => new PlayerStatDto(
                s.PlayerId,
                db.Players.Where(p => p.Id == s.PlayerId).Select(p => p.Name).FirstOrDefault(),
                s.TeamId,
                db.Teams.Where(t => t.Id == s.TeamId).Select(t => t.Name).FirstOrDefault(),
                s.Minutes, s.Rating,
                s.Goals, s.Assists, s.ShotsTotal, s.ShotsOn,
                s.Passes, s.PassesAccuracy, s.Tackles, s.Yellow, s.Red))
            .ToListAsync(ct);

        CacheControl.SetPublicMaxAge(http, 60);
        return Results.Ok(stats);
    }
}
