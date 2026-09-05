using Azulyoro.Domain.Entities;
using Azulyoro.Domain.Enums;
using Azulyoro.Infrastructure.Sync;

namespace Azulyoro.UnitTests.Sync;

public class StandingsReconcilerTests
{
    private readonly Competition league = new() { Country = "Argentina" };
    private readonly Guid season = Guid.NewGuid();
    private readonly Guid boca = Guid.NewGuid();

    [Fact]
    public void RecentDrawAddsOnePointOnceAndKeepsProviderSnapshotUnchanged()
    {
        var source = Snapshot();
        var games = Games();
        var first = Assert.Single(StandingsReconciler.Reconcile([source], games));
        var second = Assert.Single(StandingsReconciler.Reconcile([source], games));
        Assert.Equal(11, first.Standing.Points);
        Assert.Equal(8, first.Standing.Played);
        Assert.Equal(5, first.Standing.Draw);
        Assert.Equal(9, first.Standing.GoalsFor);
        Assert.Equal(10, first.Standing.GoalsAgainst);
        Assert.Equal(-1, first.Standing.GoalsDiff);
        Assert.True(first.IsProvisional);
        Assert.Equal(first.Standing.Points, second.Standing.Points);
        Assert.Equal(10, source.Points);
        Assert.Equal(7, source.Played);
    }

    [Fact]
    public void UpdatedProviderSnapshotDoesNotCountDrawTwice()
    {
        var games = Games();
        var refreshed = Assert.Single(StandingsReconciler.Reconcile([Snapshot()], games)).Standing;
        var result = Assert.Single(StandingsReconciler.Reconcile([refreshed], games));
        Assert.Equal(11, result.Standing.Points);
        Assert.Equal(8, result.Standing.Played);
        Assert.False(result.IsProvisional);
    }

    [Fact]
    public void PlayoffsAndOtherTournamentResultsDoNotAffectTable()
    {
        var games = Games();
        games.Add(Game(9, 4, 0, "Clausura - Quarter-finals"));
        games.Add(Game(10, 5, 0, "Apertura - 9"));
        games.Add(Game(11, 3, 0, "Clausura - Round of 16"));
        var result = Assert.Single(StandingsReconciler.Reconcile([Snapshot()], games));
        Assert.Equal(11, result.Standing.Points);
        Assert.Equal(8, result.Standing.Played);
    }

    [Fact]
    public void MissingFixtureOrDifferentProviderPrefixLeavesOfficialTotalsIntact()
    {
        var games = Games();
        games.RemoveAt(0);
        games.Add(Game(9, 1, 0));
        var result = Assert.Single(StandingsReconciler.Reconcile([Snapshot()], games));
        Assert.Equal(10, result.Standing.Points);
        Assert.False(result.IsProvisional);
    }

    [Fact]
    public void LiveDrawIsProvisionalAndSanctionAdjustmentIsPreserved()
    {
        var source = Snapshot();
        source.Points -= 3;
        var games = Games();
        games[^1].Status = FixtureStatus.SecondHalf;
        var result = Assert.Single(StandingsReconciler.Reconcile([source], games));
        Assert.Equal(8, result.Standing.Points);
        Assert.True(result.IsProvisional);
    }

    [Theory]
    [InlineData(FixtureStatus.SecondHalf)]
    [InlineData(FixtureStatus.Finished)]
    public void AlreadyCountedLiveWinBecomesDrawWithoutAddingPlayedAndPreservesSanction(FixtureStatus status)
    {
        var games = Games();
        var last = games[^1];
        last.Status = status;
        last.HomeGoals = 1;
        last.AwayGoals = 1;
        last.LastSyncedAt = last.DateUtc.AddMinutes(95);
        var source = CountedLiveWin(last);
        source.Points -= 3;
        var first = Assert.Single(StandingsReconciler.Reconcile([source], games));
        var again = Assert.Single(StandingsReconciler.Reconcile([source], games));

        Assert.True(first.IsProvisional);
        Assert.Equal(8, first.Standing.Points);
        Assert.Equal(8, first.Standing.Played);
        Assert.Equal(2, first.Standing.Win);
        Assert.Equal(5, first.Standing.Draw);
        Assert.Equal(1, first.Standing.Lose);
        Assert.Equal(8, first.Standing.GoalsFor);
        Assert.Equal(9, first.Standing.GoalsAgainst);
        Assert.Equal(-1, first.Standing.GoalsDiff);
        Assert.Equal("DDWWD", first.Standing.Form);
        Assert.Equal(last.LastSyncedAt, first.UpdatedAt);
        Assert.Equal(first.Standing.Points, again.Standing.Points);
        Assert.Equal(10, source.Points);
        Assert.Equal(3, source.Win);

        var alreadyApplied = Assert.Single(StandingsReconciler.Reconcile([first.Standing], games));
        Assert.Equal(8, alreadyApplied.Standing.Points);
        Assert.Equal(8, alreadyApplied.Standing.Played);
        Assert.False(alreadyApplied.IsProvisional);
    }

    [Theory]
    [InlineData("newer-source")]
    [InlineData("missing-source-time")]
    [InlineData("snapshot-before-kickoff")]
    [InlineData("snapshot-after-match-window")]
    [InlineData("invalid-residual")]
    [InlineData("missing-prefix")]
    [InlineData("unfinished-prefix")]
    public void CountedScoreIsNotReplacedWithoutProof(string scenario)
    {
        var games = Games();
        var last = games[^1];
        last.Status = FixtureStatus.SecondHalf;
        last.HomeGoals = last.AwayGoals = 1;
        last.LastSyncedAt = last.DateUtc.AddMinutes(90);
        var source = CountedLiveWin(last);
        switch (scenario)
        {
            case "newer-source": source.SourceUpdatedAtUtc = last.DateUtc.AddMinutes(95); break;
            case "missing-source-time": source.SourceUpdatedAtUtc = null; break;
            case "snapshot-before-kickoff": source.SourceUpdatedAtUtc = last.DateUtc.AddMinutes(-1); break;
            case "snapshot-after-match-window":
                source.SourceUpdatedAtUtc = last.DateUtc.AddHours(7);
                last.LastSyncedAt = last.DateUtc.AddHours(8);
                break;
            case "invalid-residual": source.Win--; break;
            case "missing-prefix": games.RemoveAt(0); break;
            case "unfinished-prefix": games[0].Status = FixtureStatus.SecondHalf; break;
        }
        var result = Assert.Single(StandingsReconciler.Reconcile([source], games));
        Assert.False(result.IsProvisional);
        Assert.Equal(source.Points, result.Standing.Points);
        Assert.Equal(source.Played, result.Standing.Played);
        Assert.Equal(source.GoalsAgainst, result.Standing.GoalsAgainst);
    }

    private Standing CountedLiveWin(Fixture last)
    {
        var source = Snapshot();
        source.Played++;
        source.Win++;
        source.Points += 3;
        source.GoalsFor++;
        source.GoalsDiff++;
        source.SourceUpdatedAtUtc = last.DateUtc.AddMinutes(45);
        source.Form = "DDWWW";
        return source;
    }

    [Fact]
    public void SameNamedZonesInDifferentPhasesNeverMergeAndRankUsesPoints()
    {
        var a = Snapshot();
        a.Rank = 2;
        var b = Snapshot();
        b.TeamId = Guid.NewGuid();
        b.Rank = 1;
        b.Points = 9;
        var apertura = Snapshot();
        apertura.GroupName = "Apertura - Group A";
        apertura.Points = 30;
        var result = StandingsReconciler.Reconcile([a, b, apertura], []);
        Assert.Equal(3, result.Count);
        Assert.Equal(1, result.Single(r => r.Standing.Id == a.Id).Standing.Rank);
        Assert.Equal(2, result.Single(r => r.Standing.Id == b.Id).Standing.Rank);
        Assert.Equal(1, result.Single(r => r.Standing.Id == apertura.Id).Standing.Rank);
    }

    [Theory]
    [InlineData("Apertura - Group B", "apertura")]
    [InlineData("Clausura - Group A", "clausura")]
    [InlineData("Aggregate Table", "annual")]
    [InlineData("Group D", "groups")]
    public void RecognizesPhaseWithoutLosingZone(string label, string phase) =>
        Assert.Equal(phase, StandingsReconciler.Phase(label));

    [Fact]
    public void AnnualCombinesOnlyExplicitPhasesAndIncludesRecentDrawOnce()
    {
        league.ExtId = 128;
        var opening = Snapshot();
        opening.GroupName = "Apertura - Group A";
        opening.Points = 30;
        opening.Played = 16;
        opening.Win = 8;
        opening.Draw = 6;
        opening.Lose = 2;
        var result = StandingsReconciler.Reconcile([opening, Snapshot()], Games());
        var annual = Assert.Single(result, r => r.Phase == "annual");
        Assert.Equal(41, annual.Standing.Points);
        Assert.Equal(24, annual.Standing.Played);
        Assert.Equal(10, annual.Standing.Win);
        Assert.Equal(11, annual.Standing.Draw);
        Assert.True(annual.IsProvisional);
    }

    [Fact]
    public void AnnualIsNotInventedWhenSourcePhasesHaveDuplicateTeams()
    {
        league.ExtId = 128;
        var opening = Snapshot();
        opening.GroupName = "Apertura - Group A";
        Assert.DoesNotContain(StandingsReconciler.Reconcile([opening, Snapshot(), Snapshot()], []), r => r.Phase == "annual");
    }

    private Standing Snapshot() => new()
    {
        TeamId = boca, CompetitionId = league.Id, Competition = league, SeasonId = season,
        GroupName = "Clausura - Group A", Points = 10, Played = 7, Win = 2, Draw = 4, Lose = 1,
        GoalsFor = 7, GoalsAgainst = 8, GoalsDiff = -1,
    };

    private List<Fixture> Games() =>
    [
        Game(1, 0, 3), Game(2, 2, 2), Game(3, 1, 0), Game(4, 1, 1),
        Game(5, 1, 1), Game(6, 1, 1), Game(7, 1, 0), Game(8, 2, 2),
    ];

    private Fixture Game(int number, int scored, int conceded, string? round = null) => new()
    {
        ExtId = number, CompetitionId = league.Id, SeasonId = season, HomeTeamId = boca,
        AwayTeamId = Guid.NewGuid(), HomeGoals = scored, AwayGoals = conceded,
        Status = FixtureStatus.Finished, Round = round ?? $"Clausura - {number}",
        DateUtc = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(number),
        LastSyncedAt = DateTime.UtcNow,
    };
}
