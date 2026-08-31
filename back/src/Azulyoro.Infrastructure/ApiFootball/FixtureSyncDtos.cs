using System.Text.Json.Serialization;

namespace Azulyoro.Infrastructure.ApiFootball;

/// <summary>Subset of the API-Football /fixtures?id= item used by live sync.</summary>
public class ApiFixtureItem
{
    [JsonPropertyName("fixture")]
    public ApiFixtureCore Fixture { get; set; } = new();

    [JsonPropertyName("goals")]
    public ApiGoals Goals { get; set; } = new();

    [JsonPropertyName("events")]
    public List<ApiFixtureEvent> Events { get; set; } = new();

    [JsonPropertyName("lineups")]
    public List<ApiFixtureLineup> Lineups { get; set; } = new();

    [JsonPropertyName("players")]
    public List<ApiFixturePlayers> Players { get; set; } = new();
}

public class ApiFixtureCore
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("status")]
    public ApiFixtureStatus Status { get; set; } = new();
}

public class ApiFixtureStatus
{
    [JsonPropertyName("short")]
    public string? Short { get; set; }

    [JsonPropertyName("elapsed")]
    public int? Elapsed { get; set; }
}

public class ApiGoals
{
    [JsonPropertyName("home")]
    public int? Home { get; set; }

    [JsonPropertyName("away")]
    public int? Away { get; set; }
}

public class ApiFixtureEvent
{
    [JsonPropertyName("time")]
    public ApiEventTime Time { get; set; } = new();

    [JsonPropertyName("team")]
    public ApiEventRef Team { get; set; } = new();

    [JsonPropertyName("player")]
    public ApiEventRef Player { get; set; } = new();

    [JsonPropertyName("assist")]
    public ApiEventRef Assist { get; set; } = new();

    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("detail")]
    public string? Detail { get; set; }

    [JsonPropertyName("comments")]
    public string? Comments { get; set; }
}

public class ApiEventTime
{
    [JsonPropertyName("elapsed")]
    public int Elapsed { get; set; }

    [JsonPropertyName("extra")]
    public int? Extra { get; set; }
}

public class ApiEventRef
{
    [JsonPropertyName("id")]
    public int? Id { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("photo")]
    public string? Photo { get; set; }
}

// ── Lineups ─────────────────────────────────────────────────────────────────

public class ApiFixtureLineup
{
    [JsonPropertyName("team")]
    public ApiEventRef Team { get; set; } = new();

    [JsonPropertyName("formation")]
    public string? Formation { get; set; }

    [JsonPropertyName("coach")]
    public ApiLineupCoach Coach { get; set; } = new();

    [JsonPropertyName("startXI")]
    public List<ApiLineupSlot> StartXI { get; set; } = new();

    [JsonPropertyName("substitutes")]
    public List<ApiLineupSlot> Substitutes { get; set; } = new();
}

public class ApiLineupCoach
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }
}

public class ApiLineupSlot
{
    [JsonPropertyName("player")]
    public ApiLineupPlayer Player { get; set; } = new();
}

public class ApiLineupPlayer
{
    [JsonPropertyName("id")]
    public int? Id { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("number")]
    public int? Number { get; set; }

    [JsonPropertyName("pos")]
    public string? Pos { get; set; }

    [JsonPropertyName("grid")]
    public string? Grid { get; set; }

    [JsonPropertyName("photo")]
    public string? Photo { get; set; }
}

// ── Per-fixture player statistics ───────────────────────────────────────────

public class ApiFixturePlayers
{
    [JsonPropertyName("team")]
    public ApiEventRef Team { get; set; } = new();

    [JsonPropertyName("players")]
    public List<ApiFixturePlayerEntry> Players { get; set; } = new();
}

public class ApiFixturePlayerEntry
{
    [JsonPropertyName("player")]
    public ApiEventRef Player { get; set; } = new();

    [JsonPropertyName("statistics")]
    public List<ApiFixturePlayerStat> Statistics { get; set; } = new();
}

public class ApiFixturePlayerStat
{
    [JsonPropertyName("games")]
    public ApiFixtureStatGames Games { get; set; } = new();

    [JsonPropertyName("goals")]
    public ApiFixtureStatGoals Goals { get; set; } = new();

    [JsonPropertyName("shots")]
    public ApiFixtureStatShots Shots { get; set; } = new();

    [JsonPropertyName("passes")]
    public ApiFixtureStatPasses Passes { get; set; } = new();

    [JsonPropertyName("tackles")]
    public ApiFixtureStatTackles Tackles { get; set; } = new();

    [JsonPropertyName("cards")]
    public ApiFixtureStatCards Cards { get; set; } = new();
}

public class ApiFixtureStatGames
{
    [JsonPropertyName("minutes")]
    public int? Minutes { get; set; }

    /// <summary>Rating arrives as a string (e.g. "7.2") or null.</summary>
    [JsonPropertyName("rating")]
    public string? Rating { get; set; }

    [JsonPropertyName("number")]
    public int? Number { get; set; }

    [JsonPropertyName("position")]
    public string? Position { get; set; }
}

public class ApiFixtureStatGoals
{
    [JsonPropertyName("total")]
    public int? Total { get; set; }

    [JsonPropertyName("assists")]
    public int? Assists { get; set; }
}

public class ApiFixtureStatShots
{
    [JsonPropertyName("total")]
    public int? Total { get; set; }

    [JsonPropertyName("on")]
    public int? On { get; set; }
}

public class ApiFixtureStatPasses
{
    [JsonPropertyName("total")]
    public int? Total { get; set; }

    /// <summary>Accuracy arrives as a string (e.g. "84" or "84%") or null.</summary>
    [JsonPropertyName("accuracy")]
    public string? Accuracy { get; set; }
}

public class ApiFixtureStatTackles
{
    [JsonPropertyName("total")]
    public int? Total { get; set; }
}

public class ApiFixtureStatCards
{
    [JsonPropertyName("yellow")]
    public int? Yellow { get; set; }

    [JsonPropertyName("red")]
    public int? Red { get; set; }
}
