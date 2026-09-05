using Azulyoro.Api.Common;
using Azulyoro.Infrastructure.Persistence;
using Azulyoro.Api.Features.Matches;
using Azulyoro.Api.Features.Standings;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Azulyoro.Api.Features.Competitions;

public record CompetitionDto(
    Guid Id,
    int ExtId,
    string Name,
    string Type,
    string? Country,
    string? LogoUrl,
    IReadOnlyList<int> Seasons);

public record CompetitionOverviewDto(CompetitionDto Competition, int Season,
    IReadOnlyList<StandingDto> Standings, IReadOnlyList<MatchDto> Fixtures, DateTime? UpdatedAt);

public static class CompetitionsEndpoints
{
    public static IEndpointRouteBuilder MapCompetitionsEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/competitions", GetCompetitions);
        app.MapGet("/api/competitions/{id:guid}/overview", GetOverview);
        return app;
    }

    private static async Task<IResult> GetCompetitions(HttpContext http, AppDbContext db, CancellationToken ct,
        int? season = null, bool bocaOnly = false)
    {
        var competitions = await ReadCompetitionsAsync(db, season, bocaOnly, ct);
        CacheControl.SetNoStore(http);
        return Results.Ok(competitions);
    }

    private static async Task<List<CompetitionDto>> ReadCompetitionsAsync(AppDbContext db, int? season,
        bool bocaOnly, CancellationToken ct)
    {
        var fixtures = db.Fixtures.AsNoTracking().AsQueryable();
        if (bocaOnly) fixtures = fixtures.Where(f => f.IsBoca);
        if (season is { } year) fixtures = fixtures.Where(f => f.Season!.Year == year);
        var query = db.Competitions.AsNoTracking().AsQueryable();
        if (bocaOnly || season.HasValue) query = query.Where(c => fixtures.Any(f => f.CompetitionId == c.Id));
        var competitions = await query
            .OrderBy(c => c.Name)
            .ToListAsync(ct);
        var participation = await db.Fixtures.AsNoTracking().Where(f => !bocaOnly || f.IsBoca)
            .Select(f => new { f.CompetitionId, f.Season!.Year }).Distinct().ToListAsync(ct);
        return competitions.Select(c => new CompetitionDto(c.Id, c.ExtId, c.Name, c.Type.ToString(), c.Country,
            c.LogoUrl, participation.Where(p => p.CompetitionId == c.Id).Select(p => p.Year).Distinct()
                .OrderDescending().ToArray())).ToList();
    }

    private static async Task<IResult> GetOverview(Guid id, HttpContext http, AppDbContext db,
        CancellationToken ct, int? season = null)
    {
        var competitions = await ReadCompetitionsAsync(db, null, true, ct);
        var competition = competitions.FirstOrDefault(c => c.Id == id);
        if (competition is null) return Results.NotFound();
        var year = season ?? await db.Seasons.AsNoTracking().Where(s => s.IsCurrent)
            .Select(s => (int?)s.Year).FirstOrDefaultAsync(ct) ?? competition.Seasons.FirstOrDefault();
        var standings = await StandingsEndpoints.ReadStandingsAsync(db, id, year, ct);
        var fixtures = await db.Fixtures.AsNoTracking()
            .Where(f => f.CompetitionId == id && f.Season!.Year == year)
            .OrderBy(f => f.DateUtc).ThenBy(f => f.ExtId)
            .Select(f => new MatchDto(f.Id, f.ExtId, f.DateUtc, f.Status.ToString(), f.CompetitionId,
                f.Competition!.Name, f.HomeTeamId, f.HomeTeam!.Name, f.HomeTeam.LogoUrl,
                f.AwayTeamId, f.AwayTeam!.Name, f.AwayTeam.LogoUrl, f.HomeGoals, f.AwayGoals, f.IsBoca,
                f.Round, f.PenaltyHome, f.PenaltyAway, f.LastSyncedAt, f.Season!.Year))
            .ToListAsync(ct);
        var updatedAt = fixtures.Select(f => f.LastSyncedAt).Concat(standings.Select(s => s.UpdatedAt))
            .Where(date => date.HasValue).DefaultIfEmpty().Max();
        CacheControl.SetNoStore(http);
        return Results.Ok(new CompetitionOverviewDto(competition, year, standings, fixtures, updatedAt));
    }
}
