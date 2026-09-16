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
        if (!await db.Teams.AnyAsync(ct))
        {
            await SeedBaseAsync(db, ct);
        }

        await SeedSaoPauloMatchAsync(db, ct);
    }

    private static async Task SeedBaseAsync(AppDbContext db, CancellationToken ct)
    {

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

        var promedios = new Competition
        {
            ExtId = 999129,
            Name = "Tabla de Promedios",
            Type = CompetitionType.League,
            Country = "Argentina",
            LogoUrl = "https://media.api-sports.io/football/leagues/128.png",
        };

        // Lineup Boca
        var lineupBoca = new FixtureLineup
        {
            Fixture = finished,
            FixtureId = finished.Id,
            Team = boca,
            TeamId = boca.Id,
            Formation = "4-3-3",
            CoachName = "Diego Martínez",
        };
        lineupBoca.Players.Add(new FixtureLineupPlayer { Lineup = lineupBoca, PlayerId = players[0].Id, IsStarter = true, Number = 1, Grid = "1:1" });
        lineupBoca.Players.Add(new FixtureLineupPlayer { Lineup = lineupBoca, PlayerId = players[1].Id, IsStarter = true, Number = 6, Grid = "2:2" });
        lineupBoca.Players.Add(new FixtureLineupPlayer { Lineup = lineupBoca, PlayerId = players[2].Id, IsStarter = true, Number = 10, Grid = "4:2" });

        // Lineup River
        var lineupRiver = new FixtureLineup
        {
            Fixture = finished,
            FixtureId = finished.Id,
            Team = river,
            TeamId = river.Id,
            Formation = "4-4-2",
            CoachName = "Marcelo Gallardo",
        };

        // Tabla de Promedios Standings (Descensos)
        var promediosStandings = new[]
        {
            new Standing { Competition = promedios, CompetitionId = promedios.Id, SeasonId = season.Id, Team = river, TeamId = river.Id, Rank = 1, Points = 180, Played = 95, Win = 52, Draw = 24, Lose = 19, GoalsFor = 150, GoalsAgainst = 80, GoalsDiff = 70, Form = "WWDWW", GroupName = "Tabla de Promedios" },
            new Standing { Competition = promedios, CompetitionId = promedios.Id, SeasonId = season.Id, Team = boca, TeamId = boca.Id, Rank = 2, Points = 175, Played = 95, Win = 50, Draw = 25, Lose = 20, GoalsFor = 145, GoalsAgainst = 82, GoalsDiff = 63, Form = "WWWDW", GroupName = "Tabla de Promedios" },
            new Standing { Competition = promedios, CompetitionId = promedios.Id, SeasonId = season.Id, Team = racing, TeamId = racing.Id, Rank = 3, Points = 160, Played = 95, Win = 45, Draw = 25, Lose = 25, GoalsFor = 130, GoalsAgainst = 90, GoalsDiff = 40, Form = "WLWDW", GroupName = "Tabla de Promedios" },
            new Standing { Competition = promedios, CompetitionId = promedios.Id, SeasonId = season.Id, Team = velez, TeamId = velez.Id, Rank = 4, Points = 145, Played = 95, Win = 38, Draw = 31, Lose = 26, GoalsFor = 110, GoalsAgainst = 95, GoalsDiff = 15, Form = "LWDWW", GroupName = "Tabla de Promedios" },
            new Standing { Competition = promedios, CompetitionId = promedios.Id, SeasonId = season.Id, Team = sanLorenzo, TeamId = sanLorenzo.Id, Rank = 5, Points = 138, Played = 95, Win = 35, Draw = 33, Lose = 27, GoalsFor = 98, GoalsAgainst = 92, GoalsDiff = 6, Form = "DDWLW", GroupName = "Tabla de Promedios" },
            new Standing { Competition = promedios, CompetitionId = promedios.Id, SeasonId = season.Id, Team = independiente, TeamId = independiente.Id, Rank = 6, Points = 125, Played = 95, Win = 30, Draw = 35, Lose = 30, GoalsFor = 92, GoalsAgainst = 98, GoalsDiff = -6, Form = "DLDWW", GroupName = "Tabla de Promedios" },
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
        db.Competitions.AddRange(liga, sudamericana, tablaAnual, promedios);
        db.Teams.AddRange(boca, river, racing, independiente, sanLorenzo, velez, fortaleza, nacional, sportivoTrinidense);
        db.Players.AddRange(players);
        db.Fixtures.AddRange(upcoming, finished);
        db.FixtureEvents.AddRange(events);
        db.FixtureLineups.AddRange(lineupBoca, lineupRiver);
        db.Standings.AddRange(ligaStandings);
        db.Standings.AddRange(sudaStandings);
        db.Standings.AddRange(tablaAnualStandings);
        db.Standings.AddRange(promediosStandings);
        db.PlayerSeasonStats.Add(playerSeasonStat);

        await db.SaveChangesAsync(ct);
    }

    public static async Task SeedSaoPauloMatchAsync(AppDbContext db, CancellationToken ct)
    {
        if (await db.Fixtures.AnyAsync(f => f.ExtId == 900003, ct))
            return;

        var boca = await db.Teams.FirstOrDefaultAsync(t => t.ExtId == 451, ct);
        var sudamericana = await db.Competitions.FirstOrDefaultAsync(c => c.ExtId == 11, ct);
        var season = await db.Seasons.FirstOrDefaultAsync(s => s.Year == 2026, ct);

        if (boca is null || sudamericana is null || season is null)
            return;

        var saoPaulo = await db.Teams.FirstOrDefaultAsync(t => t.ExtId == 126, ct);
        if (saoPaulo is null)
        {
            saoPaulo = new Team
            {
                ExtId = 126,
                Name = "Sao Paulo",
                ShortName = "Sao Paulo",
                LogoUrl = "https://media.api-sports.io/football/teams/126.png",
                Founded = 1930,
                VenueName = "Estadio Morumbí",
                VenueCity = "São Paulo",
                IsTracked = false,
            };
            db.Teams.Add(saoPaulo);
            await db.SaveChangesAsync(ct);
        }

        var cavani = await db.Players.FirstOrDefaultAsync(p => p.ExtId == 1003, ct);
        var rojo = await db.Players.FirstOrDefaultAsync(p => p.ExtId == 1002, ct);
        var romero = await db.Players.FirstOrDefaultAsync(p => p.ExtId == 1001, ct);

        var polFernandez = new Player
        {
            ExtId = 1004, TeamId = boca.Id, Team = boca,
            Name = "Pol Fernández", Firstname = "Guillermo", Lastname = "Fernández",
            Position = PlayerPosition.Midfielder, Number = 8,
            Nationality = "Argentina", BirthDate = new DateOnly(1991, 10, 11),
            Height = 179, Weight = 75, IsActive = true,
            PhotoUrl = "https://media.api-sports.io/football/players/1004.png",
        };

        var medina = new Player
        {
            ExtId = 1005, TeamId = boca.Id, Team = boca,
            Name = "Cristian Medina", Firstname = "Cristian", Lastname = "Medina",
            Position = PlayerPosition.Midfielder, Number = 36,
            Nationality = "Argentina", BirthDate = new DateOnly(2002, 6, 1),
            Height = 178, Weight = 72, IsActive = true,
            PhotoUrl = "https://media.api-sports.io/football/players/1005.png",
        };

        var merentiel = new Player
        {
            ExtId = 1006, TeamId = boca.Id, Team = boca,
            Name = "Miguel Merentiel", Firstname = "Miguel", Lastname = "Merentiel",
            Position = PlayerPosition.Attacker, Number = 16,
            Nationality = "Uruguay", BirthDate = new DateOnly(1996, 2, 24),
            Height = 176, Weight = 76, IsActive = true,
            PhotoUrl = "https://media.api-sports.io/football/players/1006.png",
        };

        var advincula = new Player
        {
            ExtId = 1007, TeamId = boca.Id, Team = boca,
            Name = "Luis Advíncula", Firstname = "Luis", Lastname = "Advíncula",
            Position = PlayerPosition.Defender, Number = 17,
            Nationality = "Peru", BirthDate = new DateOnly(1990, 3, 2),
            Height = 180, Weight = 78, IsActive = true,
            PhotoUrl = "https://media.api-sports.io/football/players/1007.png",
        };

        var lucasMoura = new Player
        {
            ExtId = 2001, TeamId = saoPaulo.Id, Team = saoPaulo,
            Name = "Lucas Moura", Firstname = "Lucas", Lastname = "Rodrigues",
            Position = PlayerPosition.Attacker, Number = 7,
            Nationality = "Brazil", BirthDate = new DateOnly(1992, 8, 13),
            Height = 172, Weight = 70, IsActive = true,
            PhotoUrl = "https://media.api-sports.io/football/players/2001.png",
        };

        var calleri = new Player
        {
            ExtId = 2002, TeamId = saoPaulo.Id, Team = saoPaulo,
            Name = "Jonathan Calleri", Firstname = "Jonathan", Lastname = "Calleri",
            Position = PlayerPosition.Attacker, Number = 9,
            Nationality = "Argentina", BirthDate = new DateOnly(1993, 9, 23),
            Height = 182, Weight = 79, IsActive = true,
            PhotoUrl = "https://media.api-sports.io/football/players/2002.png",
        };

        var rafinha = new Player
        {
            ExtId = 2003, TeamId = saoPaulo.Id, Team = saoPaulo,
            Name = "Rafinha", Firstname = "Marcio", Lastname = "Rafael",
            Position = PlayerPosition.Defender, Number = 13,
            Nationality = "Brazil", BirthDate = new DateOnly(1985, 9, 7),
            Height = 172, Weight = 68, IsActive = true,
            PhotoUrl = "https://media.api-sports.io/football/players/2003.png",
        };

        var rafaelGk = new Player
        {
            ExtId = 2004, TeamId = saoPaulo.Id, Team = saoPaulo,
            Name = "Rafael", Firstname = "Rafael", Lastname = "Pires",
            Position = PlayerPosition.Goalkeeper, Number = 23,
            Nationality = "Brazil", BirthDate = new DateOnly(1989, 6, 23),
            Height = 187, Weight = 84, IsActive = true,
            PhotoUrl = "https://media.api-sports.io/football/players/2004.png",
        };

        db.Players.AddRange(polFernandez, medina, merentiel, advincula, lucasMoura, calleri, rafinha, rafaelGk);

        var saoPauloVsBoca = new Fixture
        {
            ExtId = 900003,
            Competition = sudamericana,
            CompetitionId = sudamericana.Id,
            Season = season,
            SeasonId = season.Id,
            Round = "Octavos de Final",
            DateUtc = new DateTime(2026, 9, 16, 21, 0, 0, DateTimeKind.Utc),
            Status = FixtureStatus.Finished,
            Elapsed = 90,
            VenueName = "Estadio Morumbí",
            HomeTeam = saoPaulo,
            HomeTeamId = saoPaulo.Id,
            AwayTeam = boca,
            AwayTeamId = boca.Id,
            HomeGoals = 1,
            AwayGoals = 2,
            HtHome = 0,
            HtAway = 1,
            FtHome = 1,
            FtAway = 2,
            IsBoca = true,
        };
        db.Fixtures.Add(saoPauloVsBoca);

        var events = new[]
        {
            new FixtureEvent
            {
                Fixture = saoPauloVsBoca, FixtureId = saoPauloVsBoca.Id,
                ExtSeq = 1, Minute = 28,
                TeamId = boca.Id, PlayerId = cavani?.Id, PlayerName = "Edinson Cavani",
                Type = EventType.Goal, Detail = "Normal Goal",
            },
            new FixtureEvent
            {
                Fixture = saoPauloVsBoca, FixtureId = saoPauloVsBoca.Id,
                ExtSeq = 2, Minute = 39,
                TeamId = boca.Id, PlayerId = rojo?.Id, PlayerName = "Marcos Rojo",
                Type = EventType.Card, Detail = "Yellow Card",
            },
            new FixtureEvent
            {
                Fixture = saoPauloVsBoca, FixtureId = saoPauloVsBoca.Id,
                ExtSeq = 3, Minute = 54,
                TeamId = saoPaulo.Id, PlayerId = lucasMoura.Id, PlayerName = "Lucas Moura",
                Type = EventType.Goal, Detail = "Normal Goal",
            },
            new FixtureEvent
            {
                Fixture = saoPauloVsBoca, FixtureId = saoPauloVsBoca.Id,
                ExtSeq = 4, Minute = 65,
                TeamId = boca.Id,
                PlayerId = medina.Id, PlayerName = "Cristian Medina",
                AssistPlayerId = polFernandez.Id, AssistName = "Pol Fernández",
                Type = EventType.Substitution, Detail = "Substitution",
            },
            new FixtureEvent
            {
                Fixture = saoPauloVsBoca, FixtureId = saoPauloVsBoca.Id,
                ExtSeq = 5, Minute = 72,
                TeamId = boca.Id,
                PlayerId = merentiel.Id, PlayerName = "Miguel Merentiel",
                AssistPlayerId = cavani?.Id, AssistName = "Edinson Cavani",
                Type = EventType.Substitution, Detail = "Substitution",
            },
            new FixtureEvent
            {
                Fixture = saoPauloVsBoca, FixtureId = saoPauloVsBoca.Id,
                ExtSeq = 6, Minute = 84,
                TeamId = boca.Id, PlayerId = merentiel.Id, PlayerName = "Miguel Merentiel",
                Type = EventType.Goal, Detail = "Normal Goal",
            },
        };
        db.FixtureEvents.AddRange(events);

        var lineupBoca = new FixtureLineup
        {
            Fixture = saoPauloVsBoca,
            FixtureId = saoPauloVsBoca.Id,
            Team = boca,
            TeamId = boca.Id,
            Formation = "4-4-2",
            CoachName = "Diego Martínez",
        };
        if (romero != null) lineupBoca.Players.Add(new FixtureLineupPlayer { Lineup = lineupBoca, PlayerId = romero.Id, IsStarter = true, Number = 1, Grid = "1:1" });
        lineupBoca.Players.Add(new FixtureLineupPlayer { Lineup = lineupBoca, PlayerId = advincula.Id, IsStarter = true, Number = 17, Grid = "2:1" });
        if (rojo != null) lineupBoca.Players.Add(new FixtureLineupPlayer { Lineup = lineupBoca, PlayerId = rojo.Id, IsStarter = true, Number = 6, Grid = "2:2" });
        lineupBoca.Players.Add(new FixtureLineupPlayer { Lineup = lineupBoca, PlayerId = polFernandez.Id, IsStarter = true, Number = 8, Grid = "3:2" });
        if (cavani != null) lineupBoca.Players.Add(new FixtureLineupPlayer { Lineup = lineupBoca, PlayerId = cavani.Id, IsStarter = true, Number = 10, Grid = "4:2" });
        lineupBoca.Players.Add(new FixtureLineupPlayer { Lineup = lineupBoca, PlayerId = medina.Id, IsStarter = false, Number = 36 });
        lineupBoca.Players.Add(new FixtureLineupPlayer { Lineup = lineupBoca, PlayerId = merentiel.Id, IsStarter = false, Number = 16 });

        var lineupSp = new FixtureLineup
        {
            Fixture = saoPauloVsBoca,
            FixtureId = saoPauloVsBoca.Id,
            Team = saoPaulo,
            TeamId = saoPaulo.Id,
            Formation = "4-2-3-1",
            CoachName = "Luis Zubeldía",
        };
        lineupSp.Players.Add(new FixtureLineupPlayer { Lineup = lineupSp, PlayerId = rafaelGk.Id, IsStarter = true, Number = 23, Grid = "1:1" });
        lineupSp.Players.Add(new FixtureLineupPlayer { Lineup = lineupSp, PlayerId = rafinha.Id, IsStarter = true, Number = 13, Grid = "2:1" });
        lineupSp.Players.Add(new FixtureLineupPlayer { Lineup = lineupSp, PlayerId = lucasMoura.Id, IsStarter = true, Number = 7, Grid = "3:2" });
        lineupSp.Players.Add(new FixtureLineupPlayer { Lineup = lineupSp, PlayerId = calleri.Id, IsStarter = true, Number = 9, Grid = "4:2" });

        db.FixtureLineups.AddRange(lineupBoca, lineupSp);

        var stats = new[]
        {
            new FixtureTeamStatistic { FixtureId = saoPauloVsBoca.Id, TeamId = saoPaulo.Id, Key = "Ball Possession", Value = 54 },
            new FixtureTeamStatistic { FixtureId = saoPauloVsBoca.Id, TeamId = boca.Id, Key = "Ball Possession", Value = 46 },
            new FixtureTeamStatistic { FixtureId = saoPauloVsBoca.Id, TeamId = saoPaulo.Id, Key = "Total Shots", Value = 12 },
            new FixtureTeamStatistic { FixtureId = saoPauloVsBoca.Id, TeamId = boca.Id, Key = "Total Shots", Value = 11 },
            new FixtureTeamStatistic { FixtureId = saoPauloVsBoca.Id, TeamId = saoPaulo.Id, Key = "Shots on Goal", Value = 4 },
            new FixtureTeamStatistic { FixtureId = saoPauloVsBoca.Id, TeamId = boca.Id, Key = "Shots on Goal", Value = 6 },
            new FixtureTeamStatistic { FixtureId = saoPauloVsBoca.Id, TeamId = saoPaulo.Id, Key = "Corner Kicks", Value = 5 },
            new FixtureTeamStatistic { FixtureId = saoPauloVsBoca.Id, TeamId = boca.Id, Key = "Corner Kicks", Value = 3 },
            new FixtureTeamStatistic { FixtureId = saoPauloVsBoca.Id, TeamId = saoPaulo.Id, Key = "Fouls", Value = 14 },
            new FixtureTeamStatistic { FixtureId = saoPauloVsBoca.Id, TeamId = boca.Id, Key = "Fouls", Value = 16 },
        };
        db.FixtureTeamStatistics.AddRange(stats);

        await db.SaveChangesAsync(ct);
    }
}
