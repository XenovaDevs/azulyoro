using System.Text.Json;
using Azulyoro.Domain.Entities;
using Azulyoro.Domain.Enums;
using Azulyoro.Infrastructure.ApiFootball;
using Azulyoro.Infrastructure.Persistence;
using Azulyoro.Infrastructure.Sync;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Azulyoro.UnitTests.Sync;

public class MatchStatisticsTests
{
    private static ApiFixtureItem Payload(string statistics) => JsonSerializer.Deserialize<ApiFixtureItem>(
        "{\"fixture\":{\"id\":99,\"status\":{\"short\":\"FT\"}},\"statistics\":" + statistics + "}")!;

    private const string Totals = """
        [{"team":{"id":435},"statistics":[{"type":"Ball Possession","value":"42%"},{"type":"Total Shots","value":4}]},
         {"team":{"id":451},"statistics":[{"type":"Ball Possession","value":"58%"},{"type":"Total Shots","value":12},
           {"type":"Shots on Goal","value":0},{"type":"expected_goals","value":"1.27"},
           {"type":"Passes %","value":"83.5%"},{"type":"goals_prevented","value":-0.21},
           {"type":"Red Cards","value":null},{"type":"Fouls","value":"N/A"},
           {"type":"Yellow Cards","value":3},{"type":"unknown","value":99}]},
         {"team":{"id":999},"statistics":[{"type":"Total Shots","value":999}]}]
        """;

    private static async Task<(AppDbContext Db, Fixture Fixture)> SeedAsync()
    {
        var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var home = new Team { ExtId = 451, Name = "Boca" };
        var away = new Team { ExtId = 435, Name = "Rival" };
        var fixture = new Fixture { ExtId = 99, HomeTeamId = home.Id, AwayTeamId = away.Id,
            Status = FixtureStatus.Finished, IsBoca = true, DateUtc = DateTime.UtcNow.AddDays(-2) };
        db.AddRange(home, away, fixture);
        await db.SaveChangesAsync();
        return (db, fixture);
    }

    [Fact]
    public async Task SyncAlignsReversedTeamsAndPreservesZeroDecimalsPercentagesAndUnknowns()
    {
        var (db, fixture) = await SeedAsync();
        await using var cleanup = db;
        var api = new FakeApi(Payload(Totals));
        var sync = new FixtureDetailSyncService(db, api, NullLogger<FixtureDetailSyncService>.Instance);
        await sync.SyncFixtureDetailAsync(fixture.Id, 99, default);
        var result = (await MatchStatistics.ReadAsync(db, fixture.Id, default))!;
        Assert.NotNull(result.UpdatedAt);
        Assert.Equal(new MatchStatisticDto("possession", 58, 42), result.Statistics.Single(s => s.Key == "possession"));
        Assert.Equal(new MatchStatisticDto("shotsTotal", 12, 4), result.Statistics.Single(s => s.Key == "shotsTotal"));
        Assert.Equal(new MatchStatisticDto("shotsOnGoal", 0, null), result.Statistics.Single(s => s.Key == "shotsOnGoal"));
        Assert.Equal(1.27m, result.Statistics.Single(s => s.Key == "expectedGoals").Home);
        Assert.Equal(-0.21m, result.Statistics.Single(s => s.Key == "goalsPrevented").Home);
        Assert.Equal(83.5m, result.Statistics.Single(s => s.Key == "passesAccuracy").Home);
        Assert.DoesNotContain(result.Statistics, s => s.Key is "redCards" or "fouls" or "unknown");
        Assert.Equal(9, await db.FixtureTeamStatistics.CountAsync());
    }

    [Fact]
    public async Task RepeatedAndPartialUpdatesRetainExistingTotalsOnEmptyNullAndFailedResponses()
    {
        var (db, fixture) = await SeedAsync();
        await using var cleanup = db;
        var partial = Payload("""[{"team":{"id":451},"statistics":[{"type":"Total Shots","value":15},{"type":"Ball Possession","value":null}]}]""");
        var api = new FakeApi(Payload(Totals), Payload(Totals), partial, Payload("[]"), null);
        var sync = new FixtureDetailSyncService(db, api, NullLogger<FixtureDetailSyncService>.Instance);
        for (var i = 0; i < 3; i++) await sync.SyncFixtureDetailAsync(fixture.Id, 99, default);
        var before = (await MatchStatistics.ReadAsync(db, fixture.Id, default))!;
        Assert.Equal(15, before.Statistics.Single(s => s.Key == "shotsTotal").Home);
        Assert.Equal(58, before.Statistics.Single(s => s.Key == "possession").Home);
        await sync.SyncFixtureDetailAsync(fixture.Id, 99, default);
        await Assert.ThrowsAsync<HttpRequestException>(() => sync.SyncFixtureDetailAsync(fixture.Id, 99, default));
        var after = (await MatchStatistics.ReadAsync(db, fixture.Id, default))!;
        Assert.Equal(before.UpdatedAt, after.UpdatedAt);
        Assert.Equal(before.Statistics, after.Statistics);
        Assert.Equal(9, await db.FixtureTeamStatistics.CountAsync());
    }

    [Fact]
    public async Task EmptyStatisticsStayUnknownInsteadOfPlayerTotals()
    {
        var (db, fixture) = await SeedAsync();
        await using var cleanup = db;
        db.FixturePlayerStats.Add(new FixturePlayerStats { FixtureId = fixture.Id, TeamId = fixture.HomeTeamId, ShotsTotal = 5 });
        await db.SaveChangesAsync();
        var sync = new FixtureDetailSyncService(db, new FakeApi(Payload("null")), NullLogger<FixtureDetailSyncService>.Instance);
        await sync.SyncFixtureDetailAsync(fixture.Id, 99, default);
        var result = (await MatchStatistics.ReadAsync(db, fixture.Id, default))!;
        Assert.Null(result.UpdatedAt);
        Assert.Empty(result.Statistics);
    }

    [Fact]
    public async Task BackfillFindsOldFixturesWithOtherDetailsAndDoesNotImmediatelyRetryUnavailableCoverage()
    {
        var (db, fixture) = await SeedAsync();
        await using var cleanup = db;
        db.FixtureEvents.Add(new FixtureEvent { FixtureId = fixture.Id, PlayerName = "Player" });
        db.FixtureLineups.Add(new FixtureLineup { FixtureId = fixture.Id, TeamId = fixture.HomeTeamId });
        await db.SaveChangesAsync();
        var api = new FakeApi(Payload("[]"));
        var sync = new FixtureDetailSyncService(db, api, NullLogger<FixtureDetailSyncService>.Instance);
        await sync.BackfillFinishedAsync(8, default);
        await sync.BackfillFinishedAsync(8, default);
        Assert.Equal(1, api.Calls);
        Assert.NotNull((await db.Fixtures.FindAsync(fixture.Id))!.DetailLastAttemptAt);
    }

    [Fact]
    public async Task BackfillContinuesAfterFailureAndHonorsBatchLimit()
    {
        var (db, fixture) = await SeedAsync();
        await using var cleanup = db;
        var other = new Fixture { ExtId = 100, HomeTeamId = fixture.HomeTeamId, AwayTeamId = fixture.AwayTeamId,
            Status = FixtureStatus.Finished, IsBoca = true, DateUtc = fixture.DateUtc.AddDays(-1) };
        db.Fixtures.Add(other);
        await db.SaveChangesAsync();
        var api = new FakeApi(null, Payload("[]"));
        var sync = new FixtureDetailSyncService(db, api, NullLogger<FixtureDetailSyncService>.Instance);
        await sync.BackfillFinishedAsync(1, default);
        Assert.Equal(1, api.Calls);
        await sync.BackfillFinishedAsync(1, default);
        Assert.Equal(2, api.Calls);
        Assert.All(await db.Fixtures.ToListAsync(), f => Assert.NotNull(f.DetailLastAttemptAt));
    }

    [Fact]
    public async Task RecentlyFinishedFixtureIsRevisitedForDelayedFinalStatistics()
    {
        var (db, fixture) = await SeedAsync();
        await using var cleanup = db;
        fixture.DateUtc = DateTime.UtcNow.AddHours(-3);
        fixture.DetailLastAttemptAt = DateTime.UtcNow.AddMinutes(-20);
        db.FixtureEvents.Add(new FixtureEvent { FixtureId = fixture.Id, PlayerName = "Player" });
        db.FixtureLineups.Add(new FixtureLineup { FixtureId = fixture.Id, TeamId = fixture.HomeTeamId });
        db.FixtureTeamStatistics.AddRange(
            new FixtureTeamStatistic { FixtureId = fixture.Id, TeamId = fixture.HomeTeamId, Key = "shotsTotal", Value = 1 },
            new FixtureTeamStatistic { FixtureId = fixture.Id, TeamId = fixture.AwayTeamId, Key = "shotsTotal", Value = 1 });
        await db.SaveChangesAsync();
        var api = new FakeApi(Payload(Totals));
        var sync = new FixtureDetailSyncService(db, api, NullLogger<FixtureDetailSyncService>.Instance);
        await sync.BackfillFinishedAsync(8, default);
        Assert.Equal(1, api.Calls);
        var totals = (await MatchStatistics.ReadAsync(db, fixture.Id, default))!;
        Assert.Equal(12, totals.Statistics.Single(s => s.Key == "shotsTotal").Home);
    }

    [Fact]
    public async Task HistoricalStatisticsAreRefreshedPeriodicallyForDelayedMetrics()
    {
        var (db, fixture) = await SeedAsync();
        await using var cleanup = db;
        fixture.DateUtc = DateTime.UtcNow.AddDays(-30);
        fixture.DetailLastAttemptAt = DateTime.UtcNow.AddDays(-8);
        fixture.TeamStatisticsUpdatedAt = DateTime.UtcNow.AddDays(-8);
        db.FixtureEvents.Add(new FixtureEvent { FixtureId = fixture.Id, PlayerName = "Player" });
        db.FixtureLineups.Add(new FixtureLineup { FixtureId = fixture.Id, TeamId = fixture.HomeTeamId });
        db.FixtureTeamStatistics.AddRange(
            new FixtureTeamStatistic { FixtureId = fixture.Id, TeamId = fixture.HomeTeamId, Key = "shotsTotal", Value = 12 },
            new FixtureTeamStatistic { FixtureId = fixture.Id, TeamId = fixture.AwayTeamId, Key = "shotsTotal", Value = 4 });
        await db.SaveChangesAsync();
        var api = new FakeApi(Payload(Totals));
        var sync = new FixtureDetailSyncService(db, api, NullLogger<FixtureDetailSyncService>.Instance);
        await sync.BackfillFinishedAsync(8, default);
        Assert.Equal(1, api.Calls);
        var totals = (await MatchStatistics.ReadAsync(db, fixture.Id, default))!;
        Assert.Equal(58, totals.Statistics.Single(s => s.Key == "possession").Home);
    }

    [Fact]
    public async Task ParserUsesInvariantDecimalsRegardlessOfServerCulture()
    {
        var (db, fixture) = await SeedAsync();
        await using var cleanup = db;
        var culture = System.Globalization.CultureInfo.CurrentCulture;
        try
        {
            System.Globalization.CultureInfo.CurrentCulture = new System.Globalization.CultureInfo("es-AR");
            var sync = new FixtureDetailSyncService(db, new FakeApi(Payload(Totals)), NullLogger<FixtureDetailSyncService>.Instance);
            await sync.SyncFixtureDetailAsync(fixture.Id, 99, default);
            var totals = (await MatchStatistics.ReadAsync(db, fixture.Id, default))!;
            Assert.Equal(1.27m, totals.Statistics.Single(s => s.Key == "expectedGoals").Home);
            Assert.Equal(83.5m, totals.Statistics.Single(s => s.Key == "passesAccuracy").Home);
        }
        finally
        {
            System.Globalization.CultureInfo.CurrentCulture = culture;
        }
    }

    [Fact]
    public async Task LiveFinalSnapshotIncludesPersistedTeamStatistics()
    {
        var (db, fixture) = await SeedAsync();
        await using var cleanup = db;
        var api = new FakeApi(Payload(Totals));
        var detail = new FixtureDetailSyncService(db, api, NullLogger<FixtureDetailSyncService>.Instance);
        var hub = new LiveUpdateHub();
        await using var subscription = hub.Subscribe(fixture.Id);
        var sync = new LiveSyncService(db, api, NullLogger<LiveSyncService>.Instance, detail, updates: hub);
        Assert.True(await sync.SyncFixtureAsync(fixture.Id, 99, default));
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(3));
        var updates = subscription.ReadAllAsync(timeout.Token).GetAsyncEnumerator(timeout.Token);
        Assert.True(await updates.MoveNextAsync());
        Assert.Equal(58, updates.Current.TeamStats!.Statistics.Single(s => s.Key == "possession").Home);
    }

    private sealed class FakeApi(params ApiFixtureItem?[] payloads) : IApiFootballClient
    {
        private readonly Queue<ApiFixtureItem?> queue = new(payloads);
        public int Calls { get; private set; }
        public Task<ApiFootballResponse<T>> GetAsync<T>(string endpoint,
            IReadOnlyDictionary<string, string?>? query = null, CancellationToken cancellationToken = default)
        {
            Calls++;
            var payload = queue.Dequeue() ?? throw new HttpRequestException("Provider unavailable");
            return Task.FromResult(new ApiFootballResponse<T> { Response = [(T)(object)payload], Results = 1 });
        }
    }
}
