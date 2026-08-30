using Azulyoro.Api.Common;
using Azulyoro.Infrastructure.Persistence;
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
    string GroupName);

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
            if (currentSeasonId is { } current)
            {
                query = query.Where(s => s.SeasonId == current);
            }
        }

        var rows = await query
            .OrderBy(s => s.CompetitionId)
            .ThenBy(s => s.Rank)
            .Select(s => new StandingDto(
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
                s.GroupName))
            .ToListAsync(ct);

        CacheControl.SetPublicMaxAge(http, 300);
        return Results.Ok(rows);
    }
}
