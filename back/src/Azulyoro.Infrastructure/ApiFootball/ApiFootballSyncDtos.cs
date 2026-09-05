using System.Text.Json.Serialization;

namespace Azulyoro.Infrastructure.ApiFootball;

public sealed class ApiCompetitionItem
{
    [JsonPropertyName("league")]
    public ApiLeague League { get; set; } = new();
    [JsonPropertyName("country")]
    public ApiCompetitionCountry Country { get; set; } = new();
    [JsonPropertyName("seasons")]
    public List<ApiCompetitionSeason> Seasons { get; set; } = [];
}

public sealed class ApiCompetitionCountry
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }
}

public sealed class ApiCompetitionSeason
{
    [JsonPropertyName("year")]
    public int Year { get; set; }
    [JsonPropertyName("coverage")]
    public ApiCompetitionCoverage Coverage { get; set; } = new();
}

public sealed class ApiCompetitionCoverage
{
    [JsonPropertyName("standings")]
    public bool? Standings { get; set; }
}

public sealed class ApiTeamItem
{
    [JsonPropertyName("team")]
    public ApiTeam Team { get; set; } = new();

    [JsonPropertyName("venue")]
    public ApiVenue Venue { get; set; } = new();
}

public sealed class ApiTeam
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("code")]
    public string? Code { get; set; }

    [JsonPropertyName("country")]
    public string? Country { get; set; }

    [JsonPropertyName("founded")]
    public int? Founded { get; set; }

    [JsonPropertyName("logo")]
    public string? Logo { get; set; }
}

public sealed class ApiVenue
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("city")]
    public string? City { get; set; }
}

public sealed class ApiFixtureSyncItem
{
    [JsonPropertyName("fixture")]
    public ApiFixtureDetails Fixture { get; set; } = new();

    [JsonPropertyName("league")]
    public ApiLeague League { get; set; } = new();

    [JsonPropertyName("teams")]
    public ApiFixtureTeams Teams { get; set; } = new();

    [JsonPropertyName("goals")]
    public ApiGoals Goals { get; set; } = new();

    [JsonPropertyName("score")]
    public ApiScore Score { get; set; } = new();
}

public sealed class ApiFixtureDetails
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("date")]
    public DateTimeOffset? Date { get; set; }

    [JsonPropertyName("venue")]
    public ApiVenue Venue { get; set; } = new();

    [JsonPropertyName("status")]
    public ApiFixtureStatus Status { get; set; } = new();
}

public sealed class ApiFixtureTeams
{
    [JsonPropertyName("home")]
    public ApiTeamRef Home { get; set; } = new();

    [JsonPropertyName("away")]
    public ApiTeamRef Away { get; set; } = new();
}

public sealed class ApiTeamRef
{
    [JsonPropertyName("id")]
    public int? Id { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("logo")]
    public string? Logo { get; set; }
}

public sealed class ApiLeague
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("country")]
    public string? Country { get; set; }

    [JsonPropertyName("logo")]
    public string? Logo { get; set; }

    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("season")]
    public int? Season { get; set; }

    [JsonPropertyName("round")]
    public string? Round { get; set; }
}

public sealed class ApiScore
{
    [JsonPropertyName("extratime")]
    public ApiScorePeriod Extratime { get; set; } = new();

    [JsonPropertyName("penalty")]
    public ApiScorePeriod Penalty { get; set; } = new();

    [JsonPropertyName("halftime")]
    public ApiScorePeriod Halftime { get; set; } = new();

    [JsonPropertyName("fulltime")]
    public ApiScorePeriod Fulltime { get; set; } = new();
}

public sealed class ApiScorePeriod
{
    [JsonPropertyName("home")]
    public int? Home { get; set; }

    [JsonPropertyName("away")]
    public int? Away { get; set; }
}

public sealed class ApiStandingResponseItem
{
    [JsonPropertyName("league")]
    public ApiStandingLeague League { get; set; } = new();
}

public sealed class ApiStandingLeague
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("country")]
    public string? Country { get; set; }

    [JsonPropertyName("logo")]
    public string? Logo { get; set; }

    [JsonPropertyName("season")]
    public int Season { get; set; }

    [JsonPropertyName("standings")]
    public List<List<ApiStandingRow>> Standings { get; set; } = new();
}

public sealed class ApiStandingRow
{
    [JsonPropertyName("update")]
    public DateTimeOffset? Update { get; set; }

    [JsonPropertyName("rank")]
    public int Rank { get; set; }

    [JsonPropertyName("team")]
    public ApiTeamRef Team { get; set; } = new();

    [JsonPropertyName("points")]
    public int Points { get; set; }

    [JsonPropertyName("goalsDiff")]
    public int GoalsDiff { get; set; }

    [JsonPropertyName("group")]
    public string? Group { get; set; }

    [JsonPropertyName("form")]
    public string? Form { get; set; }

    [JsonPropertyName("all")]
    public ApiStandingRecord All { get; set; } = new();
}

public sealed class ApiStandingRecord
{
    [JsonPropertyName("played")]
    public int Played { get; set; }

    [JsonPropertyName("win")]
    public int Win { get; set; }

    [JsonPropertyName("draw")]
    public int Draw { get; set; }

    [JsonPropertyName("lose")]
    public int Lose { get; set; }

    [JsonPropertyName("goals")]
    public ApiStandingGoals Goals { get; set; } = new();
}

public sealed class ApiStandingGoals
{
    [JsonPropertyName("for")]
    public int For { get; set; }

    [JsonPropertyName("against")]
    public int Against { get; set; }
}

public sealed class ApiPlayerItem
{
    [JsonPropertyName("player")]
    public ApiPlayer Player { get; set; } = new();

    [JsonPropertyName("statistics")]
    public List<ApiPlayerStatistics> Statistics { get; set; } = new();
}

public sealed class ApiPlayer
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("firstname")]
    public string? Firstname { get; set; }

    [JsonPropertyName("lastname")]
    public string? Lastname { get; set; }

    [JsonPropertyName("birth")]
    public ApiBirth Birth { get; set; } = new();

    [JsonPropertyName("nationality")]
    public string? Nationality { get; set; }

    [JsonPropertyName("height")]
    public string? Height { get; set; }

    [JsonPropertyName("weight")]
    public string? Weight { get; set; }

    [JsonPropertyName("photo")]
    public string? Photo { get; set; }
}

public sealed class ApiBirth
{
    [JsonPropertyName("date")]
    public DateOnly? Date { get; set; }
}

public sealed class ApiPlayerStatistics
{
    [JsonPropertyName("team")]
    public ApiTeamRef Team { get; set; } = new();

    [JsonPropertyName("league")]
    public ApiLeague League { get; set; } = new();

    [JsonPropertyName("games")]
    public ApiPlayerGames Games { get; set; } = new();

    [JsonPropertyName("shots")]
    public ApiPlayerShots Shots { get; set; } = new();

    [JsonPropertyName("goals")]
    public ApiPlayerGoals Goals { get; set; } = new();

    [JsonPropertyName("passes")]
    public ApiPlayerPasses Passes { get; set; } = new();

    [JsonPropertyName("tackles")]
    public ApiPlayerTackles Tackles { get; set; } = new();

    [JsonPropertyName("cards")]
    public ApiPlayerCards Cards { get; set; } = new();

    [JsonPropertyName("rating")]
    public decimal? Rating { get; set; }
}

public sealed class ApiPlayerGames
{
    [JsonPropertyName("appearences")]
    public int? Appearances { get; set; }

    [JsonPropertyName("minutes")]
    public int? Minutes { get; set; }

    [JsonPropertyName("number")]
    public int? Number { get; set; }

    [JsonPropertyName("position")]
    public string? Position { get; set; }
}

public sealed class ApiPlayerShots
{
    [JsonPropertyName("total")]
    public int? Total { get; set; }

    [JsonPropertyName("on")]
    public int? On { get; set; }
}

public sealed class ApiPlayerGoals
{
    [JsonPropertyName("total")]
    public int? Total { get; set; }

    [JsonPropertyName("assists")]
    public int? Assists { get; set; }
}

public sealed class ApiPlayerPasses
{
    [JsonPropertyName("total")]
    public int? Total { get; set; }

    [JsonPropertyName("accuracy")]
    public int? Accuracy { get; set; }
}

public sealed class ApiPlayerTackles
{
    [JsonPropertyName("total")]
    public int? Total { get; set; }
}

public sealed class ApiPlayerCards
{
    [JsonPropertyName("yellow")]
    public int? Yellow { get; set; }

    [JsonPropertyName("red")]
    public int? Red { get; set; }
}
