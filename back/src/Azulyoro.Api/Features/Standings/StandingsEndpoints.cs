using Azulyoro.Api.Common;
using Azulyoro.Infrastructure.Persistence;
using Azulyoro.Infrastructure.Sync;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Azulyoro.Api.Features.Standings;

public record StandingDto(
    int Rank,
    Guid TeamId,
    string? TeamName,
    string? TeamLogoUrl,
    Guid CompetitionId,
    string? CompetitionName,
    int Points,
    int Played,
    int Win,
    int Draw,
    int Lose,
    int GoalsFor,
    int GoalsAgainst,
    int GoalsDiff,
    string? Form,
    string GroupName,
    string Phase,
    int Season,
    DateTime? UpdatedAt,
    bool IsProvisional);

public static class StandingsEndpoints
{
    public static IEndpointRouteBuilder MapStandingsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/standings", GetStandings);
        return app;
    }

    private static async Task<IResult> GetStandings(
        HttpContext http,
        AppDbContext db,
        Guid? competitionId,
        int? season,
        CancellationToken ct)
    {
        var rows = await ReadStandingsAsync(db, competitionId, season, ct);
        CacheControl.SetNoStore(http);
        return Results.Ok(rows);
    }

    internal static async Task<IReadOnlyList<StandingDto>> ReadStandingsAsync(
        AppDbContext db, Guid? competitionId, int? season, CancellationToken ct)
    {
        var query = db.Standings.AsNoTracking().AsQueryable();

        if (competitionId is { } competition)
        {
            query = query.Where(s => s.CompetitionId == competition);
        }

        if (season is { } year)
        {
            var seasonIds = db.Seasons.AsNoTracking()
                .Where(s => s.Year == year)
                .Select(s => s.Id);
            query = query.Where(s => seasonIds.Contains(s.SeasonId));
        }
        else
        {
            var currentSeasonId = await db.Seasons.AsNoTracking()
                .Where(s => s.IsCurrent)
                .Select(s => (Guid?)s.Id)
                .FirstOrDefaultAsync(ct);
            query = query.Where(s => s.SeasonId == currentSeasonId);
        }

        var rows = await query.Include(s => s.Team).Include(s => s.Competition)
            .OrderBy(s => s.CompetitionId)
            .ThenBy(s => s.GroupName)
            .ThenBy(s => s.Rank)
            .ToListAsync(ct);
        var competitionIds = rows.Select(s => s.CompetitionId).Distinct().ToArray();
        var seasonIdsInRows = rows.Select(s => s.SeasonId).Distinct().ToArray();
        var fixtures = await db.Fixtures.AsNoTracking()
            .Where(f => competitionIds.Contains(f.CompetitionId) && seasonIdsInRows.Contains(f.SeasonId))
            .ToListAsync(ct);
        var years = await db.Seasons.AsNoTracking().Where(s => seasonIdsInRows.Contains(s.Id))
            .ToDictionaryAsync(s => s.Id, s => s.Year, ct);
        return StandingsReconciler.Reconcile(rows, fixtures).Select(result =>
        {
            var s = result.Standing;
            return new StandingDto(
                s.Rank,
                s.TeamId,
                s.Team!.Name,
                s.Team.LogoUrl,
                s.CompetitionId,
                s.Competition!.Name,
                s.Points,
                s.Played,
                s.Win,
                s.Draw,
                s.Lose,
                s.GoalsFor,
                s.GoalsAgainst,
                s.GoalsDiff,
                s.Form,
                s.GroupName, result.Phase, years[s.SeasonId], result.UpdatedAt, result.IsProvisional);
        }).ToList();
    }
}
