using Azulyoro.Domain.Entities;
using Azulyoro.Domain.Enums;
using Azulyoro.Infrastructure.ApiFootball;
using Azulyoro.Infrastructure.Persistence;
using Azulyoro.Infrastructure.Sync;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Azulyoro.UnitTests.Sync;

public class LiveSyncServiceTests
{
    private sealed class StandingsSync : ISportsSyncService
    {
        public int Calls { get; private set; }
        public bool Fail { get; set; }
        public Task SyncStaticAsync(CancellationToken ct) => Task.CompletedTask;
        public Task SyncSemiAsync(CancellationToken ct) => Task.CompletedTask;
        public Task SyncCompetitionStandingsAsync(int competitionExtId, int seasonYear, CancellationToken ct)
        {
            Assert.Equal(128, competitionExtId);
            Assert.Equal(2026, seasonYear);
            Calls++;
            return Fail ? Task.FromException(new HttpRequestException("Provider delay")) : Task.CompletedTask;
        }
    }

    private sealed class OtherFixturesApi(ApiFixtureSyncItem item) : IApiFootballClient
    {
        public int Calls { get; private set; }
        public Task<ApiFootballResponse<T>> GetAsync<T>(string endpoint,
            IReadOnlyDictionary<string, string?>? query = null, CancellationToken cancellationToken = default)
        {
            Calls++;
            Assert.Equal(item.Fixture.Id.ToString(), query!["ids"]);
            return Task.FromResult((ApiFootballResponse<T>)(object)new ApiFootballResponse<ApiFixtureSyncItem> { Response = [item] });
        }
    }

    private const int FixtureExtId = 900002;

    /// <summary>Returns queued fixture payloads, one per call.</summary>
    private sealed class FakeApi(params ApiFixtureItem[] items) : IApiFootballClient
    {
        private readonly Queue<ApiFixtureItem> _items = new(items);
        public int Calls { get; private set; }

        public Task<ApiFootballResponse<T>> GetAsync<T>(
            string endpoint,
            IReadOnlyDictionary<string, string?>? query = null,
            CancellationToken cancellationToken = default)
        {
            Calls++;
            var response = new ApiFootballResponse<ApiFixtureItem>
            {
                Results = 1,
                Response = [_items.Dequeue()],
            };
            return Task.FromResult((ApiFootballResponse<T>)(object)response);
        }
    }

    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"livesync-{Guid.CreateVersion7()}")
            .Options);

    private static async Task<Guid> SeedLiveBocaFixtureAsync(AppDbContext db)
    {
        var season = new Season { Year = 2026, IsCurrent = true };
        var competition = new Competition { ExtId = 128, Name = "Liga Profesional", Type = CompetitionType.League };
        var boca = new Team { ExtId = 451, Name = "Boca Juniors", IsTracked = true };
        var rival = new Team { ExtId = 435, Name = "River Plate" };
        var fixture = new Fixture
        {
            ExtId = FixtureExtId,
            CompetitionId = competition.Id,
            SeasonId = season.Id,
            HomeTeamId = boca.Id,
            AwayTeamId = rival.Id,
            DateUtc = DateTime.UtcNow.AddMinutes(-60),
            Status = FixtureStatus.SecondHalf, // live
            IsBoca = true,
        };
        db.AddRange(season, competition, boca, rival, fixture);
        await db.SaveChangesAsync();
        return fixture.Id;
    }

    private static ApiFixtureItem Payload(string status, int? elapsed, int home, int away, int eventCount)
    {
        var item = new ApiFixtureItem
        {
            Fixture = new ApiFixtureCore { Id = FixtureExtId, Status = new ApiFixtureStatus { Short = status, Elapsed = elapsed } },
            Goals = new ApiGoals { Home = home, Away = away },
        };
        for (var i = 0; i < eventCount; i++)
        {
            item.Events.Add(new ApiFixtureEvent
            {
                Time = new ApiEventTime { Elapsed = 40 + i },
                Type = "Goal",
                Detail = "Normal Goal",
            });
        }
        return item;
    }

    [Fact]
    public async Task Live_poll_updates_score_and_events_then_stops_at_FT()
    {
        await using var db = NewDb();
        var fixtureId = await SeedLiveBocaFixtureAsync(db);

        var api = new FakeApi(
            Payload("2H", 60, home: 1, away: 0, eventCount: 1),   // still live
            Payload("FT", 90, home: 2, away: 1, eventCount: 2));   // finished
        var service = new LiveSyncService(db, api, NullLogger<LiveSyncService>.Instance);

        // First tick — match is live, one event so far.
        var polled1 = await service.PollOnceAsync(CancellationToken.None);
        var afterFirst = await db.Fixtures.Include(f => f.Events).AsNoTracking()
            .FirstAsync(f => f.Id == fixtureId);

        Assert.Equal(1, polled1);
        Assert.Equal(FixtureStatus.SecondHalf, afterFirst.Status);
        Assert.Equal(1, afterFirst.HomeGoals);
        Assert.Equal(0, afterFirst.AwayGoals);
        Assert.Single(afterFirst.Events);

        // Second tick — match ends 2-1 with two events.
        var polled2 = await service.PollOnceAsync(CancellationToken.None);
        var afterSecond = await db.Fixtures.Include(f => f.Events).AsNoTracking()
            .FirstAsync(f => f.Id == fixtureId);

        Assert.Equal(1, polled2);
        Assert.Equal(FixtureStatus.Finished, afterSecond.Status);
        Assert.Equal(2, afterSecond.HomeGoals);
        Assert.Equal(1, afterSecond.AwayGoals);
        Assert.Equal(2, afterSecond.Events.Count);

        // Third tick — fixture is finished, so it is no longer polled (cut off at FT).
        var polled3 = await service.PollOnceAsync(CancellationToken.None);
        Assert.Equal(0, polled3);
        Assert.Equal(2, api.Calls); // no extra API call after FT
    }

    [Fact]
    public async Task Final_score_is_saved_even_when_standings_fail_and_refresh_retries_without_repolling_match()
    {
        await using var db = NewDb();
        var fixtureId = await SeedLiveBocaFixtureAsync(db);
        var api = new FakeApi(Payload("FT", 90, 2, 2, 0));
        var standings = new StandingsSync { Fail = true };
        var service = new LiveSyncService(db, api, NullLogger<LiveSyncService>.Instance, sportsSync: standings);
        await service.PollOnceAsync(default);
        var fixture = await db.Fixtures.SingleAsync(f => f.Id == fixtureId);
        Assert.Equal(FixtureStatus.Finished, fixture.Status);
        Assert.Equal(2, fixture.HomeGoals);
        Assert.Equal(1, standings.Calls);
        var state = await db.SyncStates.SingleAsync();
        Assert.NotNull(state.LastError);

        await service.PollOnceAsync(default);
        Assert.Equal(1, standings.Calls); // throttle retries, even on failure
        state.LastRunAt = DateTime.UtcNow.AddMinutes(-6);
        await db.SaveChangesAsync();
        standings.Fail = false;
        await service.PollOnceAsync(default);
        Assert.Equal(2, standings.Calls);
        Assert.Equal(1, api.Calls);
        Assert.Null(state.LastError);
        Assert.NotNull(state.LastOkAt);
    }

    [Fact]
    public async Task Polls_other_teams_in_tracked_competitions_and_preserves_penalty_score()
    {
        await using var db = NewDb();
        var bocaFixtureId = await SeedLiveBocaFixtureAsync(db);
        var bocaFixture = await db.Fixtures.SingleAsync(f => f.Id == bocaFixtureId);
        bocaFixture.DateUtc = DateTime.UtcNow.AddDays(3);
        bocaFixture.Status = FixtureStatus.NotStarted;
        var other = new Fixture
        {
            ExtId = 999, CompetitionId = bocaFixture.CompetitionId, SeasonId = bocaFixture.SeasonId,
            HomeTeamId = bocaFixture.HomeTeamId, AwayTeamId = bocaFixture.AwayTeamId,
            DateUtc = DateTime.UtcNow.AddHours(-2), Status = FixtureStatus.Penalty, IsBoca = false,
        };
        db.Fixtures.Add(other);
        await db.SaveChangesAsync();
        var api = new OtherFixturesApi(new()
        {
            Fixture = new() { Id = 999, Status = new() { Short = "PEN" } },
            Goals = new() { Home = 2, Away = 2 }, Score = new() { Penalty = new() { Home = 4, Away = 3 } },
        });
        var service = new LiveSyncService(db, api, NullLogger<LiveSyncService>.Instance);
        Assert.Equal(1, await service.PollOnceAsync(default));
        Assert.Equal(FixtureStatus.Finished, other.Status);
        Assert.Equal(2, other.HomeGoals);
        Assert.Equal(4, other.PenaltyHome);
        Assert.Equal(0, await service.PollOnceAsync(default));
        Assert.Equal(1, api.Calls);
    }
}
