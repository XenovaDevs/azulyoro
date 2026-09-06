using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Azulyoro.Api.Common;
using Azulyoro.Api.Features.Competitions;
using Azulyoro.Api.Features.Matches;
using Azulyoro.Api.Features.Standings;
using Azulyoro.Domain.Entities;
using Azulyoro.Domain.Enums;
using Azulyoro.Infrastructure.Persistence;
using Azulyoro.Infrastructure.Sync;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Azulyoro.UnitTests.Api;

public class SportsEndpointsTests
{
    [Fact]
    public async Task StatisticsEndpointAndFinalStreamShareHomeAwayContractWithoutProviderCalls()
    {
        await using var host = await SportsHost.StartAsync();
        var id = await host.SeedStatisticsAsync();
        using var response = await host.Client.GetAsync($"/api/matches/{id}/statistics");
        Assert.True(response.Headers.CacheControl!.NoStore);
        var statistics = (await response.Content.ReadFromJsonAsync<MatchStatisticsDto>())!;
        Assert.Equal(host.UpdatedAt, statistics.UpdatedAt);
        Assert.Equal(new MatchStatisticDto("possession", 60, 40), statistics.Statistics.Single(s => s.Key == "possession"));
        Assert.Equal(new MatchStatisticDto("redCards", 0, null), statistics.Statistics.Single(s => s.Key == "redCards"));
        using var stream = await host.Client.GetAsync($"/api/matches/{id}/stream");
        var data = (await stream.Content.ReadAsStringAsync()).Split('\n').Single(line => line.StartsWith("data: "))[6..];
        using var document = JsonDocument.Parse(data);
        var streamed = document.RootElement.GetProperty("teamStats").Deserialize<MatchStatisticsDto>(new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        Assert.Equal(statistics.UpdatedAt, streamed.UpdatedAt);
        Assert.Equal(statistics.Statistics, streamed.Statistics);
        Assert.Equal(0, host.ProviderCalls);
    }

    [Fact]
    public async Task StatisticsEndpointDistinguishesUnavailableDataFromUnknownFixture()
    {
        await using var host = await SportsHost.StartAsync();
        var overview = (await host.Client.GetFromJsonAsync<CompetitionOverviewDto>($"/api/competitions/{host.Cup.Id}/overview?season=2026"))!;
        var result = (await host.Client.GetFromJsonAsync<MatchStatisticsDto>($"/api/matches/{overview.Fixtures[0].Id}/statistics"))!;
        Assert.Null(result.UpdatedAt);
        Assert.Empty(result.Statistics);
        using var missing = await host.Client.GetAsync($"/api/matches/{Guid.NewGuid()}/statistics");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        Assert.True(missing.Headers.CacheControl!.NoStore);
        Assert.Equal(0, host.ProviderCalls);
    }
    [Fact]
    public async Task CompetitionOverviewIncludesOtherTeamsAndKnockoutScoresForRequestedSeason()
    {
        await using var host = await SportsHost.StartAsync();
        using var response = await host.Client.GetAsync($"/api/competitions/{host.Cup.Id}/overview?season=2026");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl!.NoStore);
        var overview = (await response.Content.ReadFromJsonAsync<CompetitionOverviewDto>())!;
        Assert.Equal("Cup", overview.Competition.Type);
        Assert.Equal(2026, overview.Season);
        Assert.Equal(2, overview.Fixtures.Count);
        Assert.All(overview.Fixtures, match => Assert.Equal(2026, match.Season));
        var otherTeams = Assert.Single(overview.Fixtures, match => !match.IsBoca);
        Assert.Equal("Quarter-finals", otherTeams.Round);
        Assert.Equal(4, otherTeams.PenaltyHome);
        Assert.Equal(3, otherTeams.PenaltyAway);
        Assert.Equal(host.UpdatedAt, overview.UpdatedAt);
        Assert.Empty(overview.Standings);
    }

    [Fact]
    public async Task CompetitionParticipationFiltersUnusedAndHistoricalCompetitions()
    {
        await using var host = await SportsHost.StartAsync();
        using var response = await host.Client.GetAsync("/api/competitions?season=2026&bocaOnly=true");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl!.NoStore);
        var competitions = (await response.Content.ReadFromJsonAsync<CompetitionDto[]>())!;
        Assert.Equal(new[] { host.Cup.Id, host.League.Id }.Order(), competitions.Select(c => c.Id).Order());
        Assert.Equal(new[] { 2026, 2025 }, competitions.Single(c => c.Id == host.Cup.Id).Seasons);
        using var oldResponse = await host.Client.GetAsync("/api/competitions?season=2025&bocaOnly=true");
        var old = (await oldResponse.Content.ReadFromJsonAsync<CompetitionDto[]>())!;
        Assert.Contains(old, c => c.Id == host.Historical.Id);
        Assert.DoesNotContain(competitions, c => c.Id == host.Historical.Id);
    }

    [Fact]
    public async Task StandingsReconcileDrawWithoutCombiningPhasesOrCountingItTwice()
    {
        await using var host = await SportsHost.StartAsync();
        var url = $"/api/standings?competitionId={host.League.Id}&season=2026";
        using var response = await host.Client.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl!.NoStore);
        var rows = (await response.Content.ReadFromJsonAsync<StandingDto[]>())!;
        var closing = rows.Where(r => r.Phase == "clausura").ToArray();
        Assert.Equal(2, closing.Length);
        Assert.All(closing, r => Assert.Equal("Clausura - Group A", r.GroupName));
        Assert.Equal(new[] { 1, 2 }, closing.Select(r => r.Rank));
        var boca = Assert.Single(closing, r => r.TeamId == host.Boca.Id);
        Assert.Equal(1, boca.Rank);
        Assert.Equal(11, boca.Points);
        Assert.Equal(8, boca.Played);
        Assert.Equal(5, boca.Draw);
        Assert.Equal(9, boca.GoalsFor);
        Assert.Equal(10, boca.GoalsAgainst);
        Assert.True(boca.IsProvisional);
        var opening = Assert.Single(rows, r => r.Phase == "apertura" && r.TeamId == host.Boca.Id);
        Assert.Equal(30, opening.Points);
        Assert.Equal(16, opening.Played);
        var annual = Assert.Single(rows, r => r.Phase == "annual" && r.TeamId == host.Boca.Id);
        Assert.Equal(41, annual.Points);
        Assert.Equal(24, annual.Played);
        var second = (await host.Client.GetFromJsonAsync<StandingDto[]>(url))!;
        Assert.Equal(boca, second.Single(r => r.Phase == "clausura" && r.TeamId == host.Boca.Id));
    }

    [Fact]
    public async Task MatchesAcceptDateOnlyFiltersAndRemainBocaOnlyWithRoundAndSeason()
    {
        await using var host = await SportsHost.StartAsync();
        using var response = await host.Client.GetAsync($"/api/matches?competitionId={host.Cup.Id}&from=2026-09-01&to=2026-10-01&pageSize=50");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl!.NoStore);
        var page = (await response.Content.ReadFromJsonAsync<PagedResult<MatchDto>>())!;
        var match = Assert.Single(page.Items);
        Assert.True(match.IsBoca);
        Assert.Equal(2026, match.Season);
        Assert.Equal("Round of 16", match.Round);
    }

    [Fact]
    public async Task ReadingMissingMatchDetailsNeverCallsTheProvider()
    {
        await using var host = await SportsHost.StartAsync();
        var overview = (await host.Client.GetFromJsonAsync<CompetitionOverviewDto>($"/api/competitions/{host.Cup.Id}/overview?season=2026"))!;
        var match = overview.Fixtures.First();
        foreach (var resource in new[] { "events", "lineups" })
        {
            using var response = await host.Client.GetAsync($"/api/matches/{match.Id}/{resource}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("[]", await response.Content.ReadAsStringAsync());
        }
        Assert.Equal(0, host.ProviderCalls);
    }

    private sealed class SportsHost(WebApplication app, HttpClient client) : IAsyncDisposable
    {
        public HttpClient Client { get; } = client;
        public int ProviderCalls => ((NoProviderSync)app.Services.GetRequiredService<IFixtureDetailSyncService>()).Calls;
        public Competition League { get; } = new() { ExtId = 128, Name = "Liga", Country = "Argentina" };
        public Competition Cup { get; } = new() { ExtId = 130, Name = "Copa Argentina", Type = CompetitionType.Cup };
        public Competition Historical { get; } = new() { ExtId = 1032, Name = "Historical cup", Type = CompetitionType.Cup };
        public Team Boca { get; } = new() { ExtId = 451, Name = "Boca Juniors", IsTracked = true };
        public DateTime UpdatedAt { get; } = new(2026, 9, 5, 22, 0, 0, DateTimeKind.Utc);

        public static async Task<SportsHost> StartAsync()
        {
            var builder = WebApplication.CreateBuilder();
            builder.Logging.ClearProviders();
            builder.WebHost.UseTestServer();
            var database = Guid.NewGuid().ToString();
            builder.Services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(database));
            builder.Services.AddMemoryCache();
            builder.Services.AddSingleton<LiveUpdateHub>();
            builder.Services.AddSingleton<IFixtureDetailSyncService, NoProviderSync>();
            var app = builder.Build();
            app.MapCompetitionsEndpoints();
            app.MapStandingsEndpoints();
            app.MapMatchesEndpoints();
            await app.StartAsync();
            var host = new SportsHost(app, app.GetTestClient());
            await host.SeedAsync(app.Services);
            return host;
        }

        private async Task SeedAsync(IServiceProvider services)
        {
            await using var scope = services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var season = new Season { Year = 2026, IsCurrent = true };
            var old = new Season { Year = 2025 };
            var rival = new Team { ExtId = 1066, Name = "Gimnasia M." };
            var other = new Team { ExtId = 435, Name = "River Plate" };
            var unused = new Competition { ExtId = 13, Name = "Unused tournament" };
            db.AddRange(season, old, Boca, rival, other, League, Cup, Historical, unused);
            var scores = new[] { (0, 3), (2, 2), (1, 0), (1, 1), (1, 1), (1, 1), (1, 0), (2, 2) };
            for (var i = 0; i < scores.Length; i++)
                db.Fixtures.Add(Game(League, season, Boca, rival, 100 + i,
                    $"Clausura - {i + 1}", scores[i].Item1, scores[i].Item2, i));
            db.Fixtures.Add(Game(League, season, Boca, rival, 120, "Clausura - Quarter-finals", 4, 0));
            db.Fixtures.Add(Game(Cup, season, Boca, rival, 200, "Round of 16", 0, 0));
            var playoff = Game(Cup, season, rival, other, 201, "Quarter-finals", 1, 1);
            playoff.PenaltyHome = 4;
            playoff.PenaltyAway = 3;
            db.Fixtures.Add(playoff);
            db.Fixtures.Add(Game(Cup, old, Boca, rival, 202, "Final", 1, 0));
            db.Fixtures.Add(Game(Historical, old, Boca, rival, 203, "Final", 1, 0));
            db.Fixtures.Add(Game(unused, season, rival, other, 204, "Group A - 1", 1, 0));
            db.Standings.AddRange(
                Snapshot(season, Boca, "Clausura - Group A", 2, 10, 7, 2, 4, 1, 7, 8),
                Snapshot(season, rival, "Clausura - Group A", 1, 9, 7, 3, 0, 4, 5, 7),
                Snapshot(season, Boca, "Apertura - Group A", 1, 30, 16, 8, 6, 2, 22, 9),
                Snapshot(season, rival, "Apertura - Group A", 2, 19, 16, 5, 4, 7, 14, 22));
            await db.SaveChangesAsync();
        }

        public async Task<Guid> SeedStatisticsAsync()
        {
            await using var scope = app.Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var fixture = await db.Fixtures.FirstAsync(f => f.IsBoca);
            fixture.TeamStatisticsUpdatedAt = UpdatedAt;
            db.FixtureTeamStatistics.AddRange(
                new FixtureTeamStatistic { FixtureId = fixture.Id, TeamId = fixture.AwayTeamId, Key = "possession", Value = 40 },
                new FixtureTeamStatistic { FixtureId = fixture.Id, TeamId = fixture.HomeTeamId, Key = "possession", Value = 60 },
                new FixtureTeamStatistic { FixtureId = fixture.Id, TeamId = fixture.HomeTeamId, Key = "redCards", Value = 0 });
            await db.SaveChangesAsync();
            return fixture.Id;
        }

        private Fixture Game(Competition competition, Season season, Team home, Team away,
            int extId, string round, int homeGoals, int awayGoals, int day = 0) => new()
        {
            ExtId = extId, Competition = competition, CompetitionId = competition.Id,
            Season = season, SeasonId = season.Id, HomeTeam = home, HomeTeamId = home.Id,
            AwayTeam = away, AwayTeamId = away.Id, IsBoca = home == Boca || away == Boca,
            DateUtc = new DateTime(season.Year, 9, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(day),
            Round = round, Status = FixtureStatus.Finished, HomeGoals = homeGoals, AwayGoals = awayGoals,
            LastSyncedAt = UpdatedAt,
        };

        private Standing Snapshot(Season season, Team team, string group, int rank, int points,
            int played, int win, int draw, int lose, int scored, int conceded) => new()
        {
            Competition = League, CompetitionId = League.Id, SeasonId = season.Id, Team = team,
            TeamId = team.Id, GroupName = group, Rank = rank, Points = points, Played = played,
            Win = win, Draw = draw, Lose = lose, GoalsFor = scored, GoalsAgainst = conceded,
            GoalsDiff = scored - conceded, SourceUpdatedAtUtc = UpdatedAt.AddHours(-1),
        };

        public async ValueTask DisposeAsync()
        {
            Client.Dispose();
            await app.DisposeAsync();
        }
    }

    private sealed class NoProviderSync : IFixtureDetailSyncService
    {
        public int Calls { get; private set; }
        public Task<int> SyncFixtureDetailAsync(Guid fixtureId, int extId, CancellationToken ct)
        {
            Calls++;
            throw new InvalidOperationException("Endpoint tests must not call a sports provider.");
        }
        public Task BackfillFinishedAsync(int max, CancellationToken ct) =>
            throw new InvalidOperationException("Endpoint tests must not call a sports provider.");
    }
}
