using Azulyoro.Domain.Common;

namespace Azulyoro.Domain.Entities;

/// <summary>
/// Category for grouping forum discussions (e.g. Debate General, Mercado de Pases, Partidos).
/// </summary>
public class ForumCategory : Entity
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public int DisplayOrder { get; set; }
    public bool IsActive { get; set; } = true;

    public List<ForumTopic> Topics { get; set; } = [];
}

/// <summary>
/// Discussion topic / thread. Can be optionally linked to a specific match (Fixture).
/// </summary>
public class ForumTopic : Entity
{
    public Guid CategoryId { get; set; }
    public ForumCategory? Category { get; set; }

    /// <summary>Optional reference to a match fixture when the topic discusses a specific game.</summary>
    public Guid? MatchId { get; set; }
    public Fixture? Match { get; set; }

    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;

    public bool IsPinned { get; set; }
    public bool IsLocked { get; set; }
    public int ViewsCount { get; set; }
    public int PostsCount { get; set; }
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;

    public List<ForumPost> Posts { get; set; } = [];
}

/// <summary>
/// Individual response / post within a discussion topic.
/// </summary>
public class ForumPost : Entity
{
    public Guid TopicId { get; set; }
    public ForumTopic? Topic { get; set; }

    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;
    public bool IsDeleted { get; set; }
}
