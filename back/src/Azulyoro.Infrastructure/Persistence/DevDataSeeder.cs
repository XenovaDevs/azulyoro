using Azulyoro.Domain.Entities;
using Azulyoro.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Azulyoro.Infrastructure.Persistence;

/// <summary>
/// Dev-only, idempotent seeder so the read endpoints return coherent data
/// without hitting the external API. Guard invocation behind IsDevelopment().
/// </summary>
public static class DevDataSeeder
{
    public static async Task SeedAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Teams.AnyAsync(ct))
            return;

        var season = new Season { Year = 2026, IsCurrent = true };

        var liga = new Competition
        {
            ExtId = 128,
            Name = "Liga Profesional",
            Type = CompetitionType.League,
            Country = "Argentina",
            LogoUrl = "https://media.api-sports.io/football/leagues/128.png",
        };

        var sudamericana = new Competition
        {
            ExtId = 11,
            Name = "Copa Sudamericana",
            Type = CompetitionType.Cup,
            Country = "South America",
            LogoUrl = "https://media.api-sports.io/football/leagues/11.png",
        };

        var tablaAnual = new Competition
        {
            ExtId = 999128,
            Name = "Tabla Anual 2026",
            Type = CompetitionType.League,
            Country = "Argentina",
            LogoUrl = "https://media.api-sports.io/football/leagues/128.png",
        };

        var boca = new Team
        {
            ExtId = 451,
            Name = "Boca Juniors",
            ShortName = "Boca",
            LogoUrl = "https://media.api-sports.io/football/teams/451.png",
            Founded = 1905,
            VenueName = "La Bombonera",
            VenueCity = "Buenos Aires",
            IsTracked = true,
        };

        var river = new Team
        {
            ExtId = 435,
            Name = "River Plate",
            ShortName = "River",
            LogoUrl = "https://media.api-sports.io/football/teams/435.png",
            Founded = 1901,
            VenueName = "Monumental",
            VenueCity = "Buenos Aires",
            IsTracked = false,
        };

        var racing = new Team
        {
            ExtId = 436,
            Name = "Racing Club",
            ShortName = "Racing",
            LogoUrl = "https://media.api-sports.io/football/teams/436.png",
            Founded = 1903,
            VenueName = "Cilindro de Avellaneda",
            VenueCity = "Avellaneda",
            IsTracked = false,
        };

        var independiente = new Team
        {
            ExtId = 445,
            Name = "Independiente",
            ShortName = "Independiente",
            LogoUrl = "https://media.api-sports.io/football/teams/445.png",
            Founded = 1905,
            VenueName = "Libertadores de América",
            VenueCity = "Avellaneda",
            IsTracked = false,
        };

        var sanLorenzo = new Team
        {
            ExtId = 449,
            Name = "San Lorenzo",
            ShortName = "San Lorenzo",
            LogoUrl = "https://media.api-sports.io/football/teams/449.png",
            Founded = 1908,
            VenueName = "Pedro Bidegain",
            VenueCity = "Buenos Aires",
            IsTracked = false,
        };

        var velez = new Team
        {
            ExtId = 448,
            Name = "Vélez Sarsfield",
            ShortName = "Vélez",
            LogoUrl = "https://media.api-sports.io/football/teams/448.png",
            Founded = 1910,
            VenueName = "José Amalfitani",
            VenueCity = "Buenos Aires",
            IsTracked = false,
        };

        var fortaleza = new Team
        {
            ExtId = 131,
            Name = "Fortaleza",
            ShortName = "Fortaleza",
            LogoUrl = "https://media.api-sports.io/football/teams/131.png",
            Founded = 1918,
            VenueName = "Castelão",
            VenueCity = "Fortaleza",
            IsTracked = false,
        };

        var nacional = new Team
        {
            ExtId = 1113,
            Name = "Nacional Potosí",
            ShortName = "Nacional",
            LogoUrl = "https://media.api-sports.io/football/teams/1113.png",
            Founded = 1942,
            VenueName = "Víctor Agustín Ugarte",
            VenueCity = "Potosí",
            IsTracked = false,
        };

        var sportivoTrinidense = new Team
        {
            ExtId = 2501,
            Name = "Sportivo Trinidense",
            ShortName = "Trinidense",
            LogoUrl = "https://media.api-sports.io/football/teams/2501.png",
            Founded = 1935,
            VenueName = "Martín Torres",
            VenueCity = "Asunción",
            IsTracked = false,
        };

        var players = new[]
        {
            new Player
            {
                ExtId = 1001, TeamId = boca.Id, Team = boca,
                Name = "Sergio Romero", Firstname = "Sergio", Lastname = "Romero",
                Position = PlayerPosition.Goalkeeper, Number = 1,
                Nationality = "Argentina", BirthDate = new DateOnly(1987, 2, 22),
                Height = 192, Weight = 82, IsActive = true,
                PhotoUrl = "https://media.api-sports.io/football/players/1001.png",
            },
            new Player
            {
                ExtId = 1002, TeamId = boca.Id, Team = boca,
                Name = "Marcos Rojo", Firstname = "Marcos", Lastname = "Rojo",
                Position = PlayerPosition.Defender, Number = 6,
                Nationality = "Argentina", BirthDate = new DateOnly(1990, 3, 20),
                Height = 189, Weight = 82, IsActive = true,
                PhotoUrl = "https://media.api-sports.io/football/players/1002.png",
            },
            new Player
            {
                ExtId = 1003, TeamId = boca.Id, Team = boca,
                Name = "Edinson Cavani", Firstname = "Edinson", Lastname = "Cavani",
                Position = PlayerPosition.Attacker, Number = 10,
                Nationality = "Uruguay", BirthDate = new DateOnly(1987, 2, 14),
                Height = 184, Weight = 77, IsActive = true,
                PhotoUrl = "https://media.api-sports.io/football/players/1003.png",
            },
        };

        var upcoming = new Fixture
        {
            ExtId = 900001,
            Competition = liga, CompetitionId = liga.Id,
            Season = season, SeasonId = season.Id,
            Round = "Fecha 5",
            DateUtc = DateTime.UtcNow.AddDays(7),
            Status = FixtureStatus.NotStarted,
            VenueName = "La Bombonera",
            HomeTeam = boca, HomeTeamId = boca.Id,
            AwayTeam = river, AwayTeamId = river.Id,
            IsBoca = true,
        };

        var finished = new Fixture
        {
            ExtId = 900002,
            Competition = liga, CompetitionId = liga.Id,
            Season = season, SeasonId = season.Id,
            Round = "Fecha 4",
            DateUtc = DateTime.UtcNow.AddDays(-7),
            Status = FixtureStatus.Finished,
            Elapsed = 90,
            VenueName = "Monumental",
            HomeTeam = river, HomeTeamId = river.Id,
            AwayTeam = boca, AwayTeamId = boca.Id,
            HomeGoals = 1, AwayGoals = 2,
            HtHome = 0, HtAway = 1,
            FtHome = 1, FtAway = 2,
            IsBoca = true,
        };

        var events = new[]
        {
            new FixtureEvent
            {
                Fixture = finished, FixtureId = finished.Id,
                ExtSeq = 1, Minute = 23,
                TeamId = boca.Id, PlayerId = players[2].Id,
                Type = EventType.Goal, Detail = "Normal Goal",
            },
            new FixtureEvent
            {
                Fixture = finished, FixtureId = finished.Id,
                ExtSeq = 2, Minute = 55,
                TeamId = river.Id,
                Type = EventType.Goal, Detail = "Penalty",
            },
            new FixtureEvent
            {
                Fixture = finished, FixtureId = finished.Id,
                ExtSeq = 3, Minute = 78,
                TeamId = boca.Id, PlayerId = players[1].Id,
                Type = EventType.Goal, Detail = "Header",
            },
        };

        // Liga Standings
        var ligaStandings = new[]
        {
            new Standing { Competition = liga, CompetitionId = liga.Id, SeasonId = season.Id, Team = boca, TeamId = boca.Id, Rank = 1, Points = 10, Played = 4, Win = 3, Draw = 1, Lose = 0, GoalsFor = 8, GoalsAgainst = 3, GoalsDiff = 5, Form = "WWDW", GroupName = "Liga Profesional" },
            new Standing { Competition = liga, CompetitionId = liga.Id, SeasonId = season.Id, Team = river, TeamId = river.Id, Rank = 2, Points = 9, Played = 4, Win = 3, Draw = 0, Lose = 1, GoalsFor = 7, GoalsAgainst = 3, GoalsDiff = 4, Form = "WWWL", GroupName = "Liga Profesional" },
            new Standing { Competition = liga, CompetitionId = liga.Id, SeasonId = season.Id, Team = racing, TeamId = racing.Id, Rank = 3, Points = 8, Played = 4, Win = 2, Draw = 2, Lose = 0, GoalsFor = 6, GoalsAgainst = 2, GoalsDiff = 4, Form = "WDDW", GroupName = "Liga Profesional" },
            new Standing { Competition = liga, CompetitionId = liga.Id, SeasonId = season.Id, Team = velez, TeamId = velez.Id, Rank = 4, Points = 7, Played = 4, Win = 2, Draw = 1, Lose = 1, GoalsFor = 5, GoalsAgainst = 4, GoalsDiff = 1, Form = "LWDW", GroupName = "Liga Profesional" },
            new Standing { Competition = liga, CompetitionId = liga.Id, SeasonId = season.Id, Team = sanLorenzo, TeamId = sanLorenzo.Id, Rank = 5, Points = 5, Played = 4, Win = 1, Draw = 2, Lose = 1, GoalsFor = 4, GoalsAgainst = 4, GoalsDiff = 0, Form = "DLDW", GroupName = "Liga Profesional" },
            new Standing { Competition = liga, CompetitionId = liga.Id, SeasonId = season.Id, Team = independiente, TeamId = independiente.Id, Rank = 6, Points = 4, Played = 4, Win = 1, Draw = 1, Lose = 2, GoalsFor = 3, GoalsAgainst = 5, GoalsDiff = -2, Form = "LLWD", GroupName = "Liga Profesional" },
        };

        // Copa Sudamericana Standings (Grupo D)
        var sudaStandings = new[]
        {
            new Standing { Competition = sudamericana, CompetitionId = sudamericana.Id, SeasonId = season.Id, Team = boca, TeamId = boca.Id, Rank = 1, Points = 11, Played = 6, Win = 3, Draw = 2, Lose = 1, GoalsFor = 10, GoalsAgainst = 6, GoalsDiff = 4, Form = "DWDWW", GroupName = "Grupo D" },
            new Standing { Competition = sudamericana, CompetitionId = sudamericana.Id, SeasonId = season.Id, Team = fortaleza, TeamId = fortaleza.Id, Rank = 2, Points = 13, Played = 6, Win = 4, Draw = 1, Lose = 1, GoalsFor = 15, GoalsAgainst = 8, GoalsDiff = 7, Form = "WWLWD", GroupName = "Grupo D" },
            new Standing { Competition = sudamericana, CompetitionId = sudamericana.Id, SeasonId = season.Id, Team = nacional, TeamId = nacional.Id, Rank = 3, Points = 7, Played = 6, Win = 2, Draw = 1, Lose = 3, GoalsFor = 6, GoalsAgainst = 13, GoalsDiff = -7, Form = "DWLLW", GroupName = "Grupo D" },
            new Standing { Competition = sudamericana, CompetitionId = sudamericana.Id, SeasonId = season.Id, Team = sportivoTrinidense, TeamId = sportivoTrinidense.Id, Rank = 4, Points = 3, Played = 6, Win = 1, Draw = 0, Lose = 5, GoalsFor = 5, GoalsAgainst = 9, GoalsDiff = -4, Form = "LLWLL", GroupName = "Grupo D" },
        };

        // Tabla Anual Standings (Clasificación a Copas)
        var tablaAnualStandings = new[]
        {
            new Standing { Competition = tablaAnual, CompetitionId = tablaAnual.Id, SeasonId = season.Id, Team = boca, TeamId = boca.Id, Rank = 1, Points = 56, Played = 27, Win = 16, Draw = 8, Lose = 3, GoalsFor = 45, GoalsAgainst = 21, GoalsDiff = 24, Form = "WWDWW", GroupName = "Tabla Anual" },
            new Standing { Competition = tablaAnual, CompetitionId = tablaAnual.Id, SeasonId = season.Id, Team = river, TeamId = river.Id, Rank = 2, Points = 54, Played = 27, Win = 15, Draw = 9, Lose = 3, GoalsFor = 48, GoalsAgainst = 22, GoalsDiff = 26, Form = "WDWLW", GroupName = "Tabla Anual" },
            new Standing { Competition = tablaAnual, CompetitionId = tablaAnual.Id, SeasonId = season.Id, Team = racing, TeamId = racing.Id, Rank = 3, Points = 48, Played = 27, Win = 14, Draw = 6, Lose = 7, GoalsFor = 39, GoalsAgainst = 28, GoalsDiff = 11, Form = "WWLWD", GroupName = "Tabla Anual" },
            new Standing { Competition = tablaAnual, CompetitionId = tablaAnual.Id, SeasonId = season.Id, Team = velez, TeamId = velez.Id, Rank = 4, Points = 46, Played = 27, Win = 13, Draw = 7, Lose = 7, GoalsFor = 35, GoalsAgainst = 25, GoalsDiff = 10, Form = "LWDWW", GroupName = "Tabla Anual" },
            new Standing { Competition = tablaAnual, CompetitionId = tablaAnual.Id, SeasonId = season.Id, Team = sanLorenzo, TeamId = sanLorenzo.Id, Rank = 5, Points = 41, Played = 27, Win = 10, Draw = 11, Lose = 6, GoalsFor = 29, GoalsAgainst = 24, GoalsDiff = 5, Form = "DDWLW", GroupName = "Tabla Anual" },
            new Standing { Competition = tablaAnual, CompetitionId = tablaAnual.Id, SeasonId = season.Id, Team = independiente, TeamId = independiente.Id, Rank = 6, Points = 38, Played = 27, Win = 9, Draw = 11, Lose = 7, GoalsFor = 27, GoalsAgainst = 26, GoalsDiff = 1, Form = "DLDWW", GroupName = "Tabla Anual" },
        };

        var playerSeasonStat = new PlayerSeasonStats
        {
            PlayerId = players[2].Id,
            CompetitionId = liga.Id,
            SeasonId = season.Id,
            Appearances = 4, Minutes = 340,
            Goals = 3, Assists = 1, Yellow = 1, Red = 0,
            Rating = 7.4m,
        };

        db.Seasons.Add(season);
        db.Competitions.AddRange(liga, sudamericana, tablaAnual);
        db.Teams.AddRange(boca, river, racing, independiente, sanLorenzo, velez, fortaleza, nacional, sportivoTrinidense);
        db.Players.AddRange(players);
        db.Fixtures.AddRange(upcoming, finished);
        db.FixtureEvents.AddRange(events);
        db.Standings.AddRange(ligaStandings);
        db.Standings.AddRange(sudaStandings);
        db.Standings.AddRange(tablaAnualStandings);
        db.PlayerSeasonStats.Add(playerSeasonStat);

        await db.SaveChangesAsync(ct);
    }
}
