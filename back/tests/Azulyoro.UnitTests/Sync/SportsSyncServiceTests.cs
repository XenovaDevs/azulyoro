using Azulyoro.Domain.Entities;
using Azulyoro.Domain.Enums;
using Azulyoro.Infrastructure.ApiFootball;
using Azulyoro.Infrastructure.Persistence;
using Azulyoro.Infrastructure.Sync;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Azulyoro.UnitTests.Sync;

public class SportsSyncServiceTests
{
    private sealed class FakeApi : IApiFootballClient
    {
        public List<ApiFixtureSyncItem> BocaFixtures { get; set; } = [];
        public Dictionary<int, List<ApiFixtureSyncItem>> Fixtures { get; } = [];
        public Dictionary<int, List<ApiStandingResponseItem>> Standings { get; } = [];
        public HashSet<int> FailedStandings { get; } = [];
        public List<ApiCompetitionItem> Competitions { get; set; } = [];
        public bool FailDiscovery { get; set; }
        public List<(string Endpoint, string? League)> Calls { get; } = [];

        public Task<ApiFootballResponse<T>> GetAsync<T>(string endpoint,
            IReadOnlyDictionary<string, string?>? query = null, CancellationToken cancellationToken = default)
        {
            var league = query?.GetValueOrDefault("league");
            Calls.Add((endpoint, league));
            object result = endpoint switch
            {
                "leagues" => new ApiFootballResponse<ApiCompetitionItem> { Response = Competitions },
                "fixtures" when league is null && FailDiscovery => throw new HttpRequestException("Team discovery unavailable"),
                "fixtures" => new ApiFootballResponse<ApiFixtureSyncItem>
                {
                    Response = league is null ? BocaFixtures : Fixtures.GetValueOrDefault(int.Parse(league)) ?? [],
                },
                "standings" when FailedStandings.Contains(int.Parse(league!)) => throw new HttpRequestException("Provider unavailable"),
                "standings" => new ApiFootballResponse<ApiStandingResponseItem>
                {
                    Response = Standings.GetValueOrDefault(int.Parse(league!)) ?? [],
                },
                _ => throw new InvalidOperationException(endpoint),
            };
            return Task.FromResult((ApiFootballResponse<T>)result);
        }
    }

    private static AppDbContext NewDb() => new(new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase($"sports-{Guid.NewGuid()}").Options);
    private static SportsSyncService Service(AppDbContext db, FakeApi api) => new(db, api,
        Options.Create(new SportsSyncOptions { Season = 2026 }), NullLogger<SportsSyncService>.Instance);
    private static ApiFixtureSyncItem Fixture(int id, int league, int home = 451, int away = 435) => new()
    {
        Fixture = new() { Id = id, Date = DateTimeOffset.UtcNow, Status = new() { Short = "FT" } },
        League = new() { Id = league, Name = $"Competition {league}", Season = 2026, Round = "Clausura - 8" },
        Teams = new() { Home = new() { Id = home, Name = $"Team {home}" }, Away = new() { Id = away, Name = $"Team {away}" } },
        Goals = new() { Home = 2, Away = 2 },
    };
    private static ApiStandingResponseItem Table(int league, int points, DateTimeOffset updated, string group = "Clausura - Group A") => new()
    {
        League = new() { Id = league, Season = 2026, Standings = [[new()
        {
            Team = new() { Id = 451, Name = "Boca" }, Group = group,
            Points = points, Update = updated, All = new() { Played = 8, Win = 2, Draw = 5, Lose = 1 },
        }]] },
    };

    [Fact]
    public async Task Discovers_all_competitions_and_ingests_other_teams_and_knockouts_idempotently()
    {
        await using var db = NewDb();
        var api = new FakeApi
        {
            BocaFixtures = [Fixture(1, 128), Fixture(2, 13), Fixture(3, 130)],
            Competitions = [new() { League = new() { Id = 13, Name = "Libertadores", Type = "Cup" } }],
        };
        api.Fixtures[128] = [Fixture(1, 128), Fixture(4, 128, 436, 437)];
        var cup = Fixture(5, 13, 438, 439);
        cup.League.Round = "Semi-finals";
        cup.Score.Penalty = new() { Home = 5, Away = 4 };
        api.Fixtures[13] = [cup];
        api.Standings[13] = [Table(13, 12, DateTimeOffset.UtcNow, "Group C")];
        api.Standings[128] = [Table(128, 11, DateTimeOffset.UtcNow)];
        var service = Service(db, api);
        await service.SyncSemiAsync(default);
        await service.SyncSemiAsync(default);

        Assert.Equal(5, await db.Fixtures.CountAsync());
        Assert.Equal(3, await db.Fixtures.CountAsync(f => f.IsBoca));
        Assert.Equal(2, await db.Standings.CountAsync());
        Assert.Equal(CompetitionType.Cup, (await db.Competitions.SingleAsync(c => c.ExtId == 13)).Type);
        var knockout = await db.Fixtures.SingleAsync(f => f.ExtId == 5);
        Assert.Equal("Semi-finals", knockout.Round);
        Assert.Equal(5, knockout.PenaltyHome);
        Assert.Contains(("fixtures", "130"), api.Calls);
        Assert.Contains(("standings", "13"), api.Calls);
    }

    [Fact]
    public async Task Empty_failed_and_older_standings_preserve_tables_and_do_not_block_fixture_scores()
    {
        await using var db = NewDb();
        var updated = DateTimeOffset.UtcNow;
        var api = new FakeApi { BocaFixtures = [Fixture(1, 128), Fixture(2, 13)] };
        api.Standings[128] = [Table(128, 11, updated), Table(128, 22, updated, "Apertura - Group A")];
        api.Standings[13] = [Table(13, 12, updated, "Group C")];
        var service = Service(db, api);
        await service.SyncSemiAsync(default);
        api.Standings[128] = [Table(128, 10, updated.AddHours(-1))];
        api.FailedStandings.Add(13);
        api.BocaFixtures[0].Goals.Home = 3;
        await Assert.ThrowsAsync<AggregateException>(() => service.SyncSemiAsync(default));
        Assert.Equal(3, (await db.Fixtures.SingleAsync(f => f.ExtId == 1)).HomeGoals);
        Assert.Equal(11, (await db.Standings.SingleAsync(s => s.GroupName == "Clausura - Group A")).Points);
        Assert.Equal(3, await db.Standings.CountAsync());
        api.Standings[128] = [];
        await Assert.ThrowsAsync<AggregateException>(() => service.SyncSemiAsync(default));
        Assert.Equal(3, await db.Standings.CountAsync());
    }

    [Fact]
    public async Task Discovery_failure_still_updates_known_competitions_and_reports_partial_failure()
    {
        await using var db = NewDb();
        var api = new FakeApi { BocaFixtures = [Fixture(1, 128)] };
        var service = Service(db, api);
        await service.SyncSemiAsync(default);
        api.FailDiscovery = true;
        var updated = Fixture(1, 128);
        updated.Goals.Home = 4;
        api.Fixtures[128] = [updated];
        await Assert.ThrowsAsync<AggregateException>(() => service.SyncSemiAsync(default));
        Assert.Equal(4, (await db.Fixtures.SingleAsync()).HomeGoals);
    }

    [Fact]
    public async Task Provider_coverage_skips_nonexistent_cup_standings_and_country_comes_from_catalog()
    {
        await using var db = NewDb();
        var api = new FakeApi
        {
            BocaFixtures = [Fixture(1, 130)],
            Competitions = [new()
            {
                League = new() { Id = 130, Name = "Copa Argentina", Type = "Cup" },
                Country = new() { Name = "Argentina" },
                Seasons = [new() { Year = 2026, Coverage = new() { Standings = false } }],
            }],
        };
        await Service(db, api).SyncSemiAsync(default);
        Assert.DoesNotContain(("standings", "130"), api.Calls);
        Assert.Equal("Argentina", (await db.Competitions.SingleAsync()).Country);
    }
}
