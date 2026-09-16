using System.Security.Claims;
using Azulyoro.Api.Common;
using Azulyoro.Api.Features.Admin;
using Azulyoro.Domain.Entities;
using Azulyoro.Infrastructure.Identity;
using Azulyoro.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Azulyoro.Api.Features.Forum;

public static class ForumEndpoints
{
    public static IEndpointRouteBuilder MapForumEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/forum");

        // Public read endpoints
        group.MapGet("/categories", GetCategories);
        group.MapGet("/categories/{slug}", GetCategoryBySlug);
        group.MapGet("/topics", GetTopics);
        group.MapGet("/topics/{idOrSlug}", GetTopicDetail);
        group.MapGet("/match/{matchId:guid}", GetMatchTopic);

        // Authenticated user interactions
        group.MapPost("/topics", CreateTopic).RequireAuthorization();
        group.MapPost("/topics/{id:guid}/posts", CreatePost).RequireAuthorization();

        // Admin moderation
        group.MapPost("/admin/moderate-user", ModerateUser).RequireAuthorization();
        group.MapGet("/admin/moderated-users", GetModeratedUsers).RequireAuthorization();

        return app;
    }

    // --- Records / DTOs ---

    public record ForumCategoryDto(
        Guid Id,
        string Name,
        string Slug,
        string? Description,
        string? Icon,
        int DisplayOrder,
        int TopicsCount,
        int PostsCount);

    public record ForumTopicSummaryDto(
        Guid Id,
        Guid CategoryId,
        string CategoryName,
        string CategorySlug,
        Guid? MatchId,
        Guid AuthorId,
        string AuthorName,
        string Title,
        string Slug,
        bool IsPinned,
        bool IsLocked,
        int ViewsCount,
        int PostsCount,
        DateTime CreatedAt,
        DateTime LastActivityAt);

    public record ForumPostDto(
        Guid Id,
        Guid TopicId,
        Guid AuthorId,
        string AuthorName,
        string Content,
        DateTime CreatedAt,
        bool IsDeleted);

    public record ForumTopicDetailDto(
        Guid Id,
        Guid CategoryId,
        string CategoryName,
        string CategorySlug,
        Guid? MatchId,
        string? MatchLabel,
        Guid AuthorId,
        string AuthorName,
        string Title,
        string Slug,
        string Content,
        bool IsPinned,
        bool IsLocked,
        int ViewsCount,
        int PostsCount,
        DateTime CreatedAt,
        DateTime LastActivityAt,
        List<ForumPostDto> Posts);

    public record CreateTopicRequest(
        Guid CategoryId,
        Guid? MatchId,
        string Title,
        string Content);

    public record CreatePostRequest(
        string Content);

    public record ModerateUserRequest(
        Guid UserId,
        string Action, // "suspend" | "ban" | "unban"
        int? Days,
        string? Reason);

    // --- Handlers ---

    private static async Task<IResult> GetCategories(
        AppDbContext db,
        CancellationToken ct)
    {
        var categories = await db.ForumCategories
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.DisplayOrder)
            .Select(c => new ForumCategoryDto(
                c.Id,
                c.Name,
                c.Slug,
                c.Description,
                c.Icon,
                c.DisplayOrder,
                c.Topics.Count,
                c.Topics.SelectMany(t => t.Posts).Count()))
            .ToListAsync(ct);

        return Results.Ok(categories);
    }

    private static async Task<IResult> GetCategoryBySlug(
        string slug,
        AppDbContext db,
        CancellationToken ct,
        int page = 1,
        int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 5, 50);

        var category = await db.ForumCategories
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Slug == slug && c.IsActive, ct);

        if (category is null)
            return Results.NotFound(new { message = "Category not found" });

        var total = await db.ForumTopics
            .Where(t => t.CategoryId == category.Id)
            .CountAsync(ct);

        var topics = await db.ForumTopics
            .AsNoTracking()
            .Where(t => t.CategoryId == category.Id)
            .OrderByDescending(t => t.IsPinned)
            .ThenByDescending(t => t.LastActivityAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new ForumTopicSummaryDto(
                t.Id,
                t.CategoryId,
                category.Name,
                category.Slug,
                t.MatchId,
                t.AuthorId,
                t.AuthorName,
                t.Title,
                t.Slug,
                t.IsPinned,
                t.IsLocked,
                t.ViewsCount,
                t.PostsCount,
                t.CreatedAt,
                t.LastActivityAt))
            .ToListAsync(ct);

        return Results.Ok(new
        {
            category = new ForumCategoryDto(
                category.Id,
                category.Name,
                category.Slug,
                category.Description,
                category.Icon,
                category.DisplayOrder,
                total,
                0),
            topics,
            page,
            pageSize,
            total,
        });
    }

    private static async Task<IResult> GetTopics(
        AppDbContext db,
        CancellationToken ct,
        Guid? categoryId = null,
        Guid? matchId = null,
        string? search = null,
        int page = 1,
        int pageSize = 20)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 5, 50);

        var query = db.ForumTopics
            .AsNoTracking()
            .Include(t => t.Category)
            .AsQueryable();

        if (categoryId.HasValue)
            query = query.Where(t => t.CategoryId == categoryId.Value);

        if (matchId.HasValue)
            query = query.Where(t => t.MatchId == matchId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(t => t.Title.ToLower().Contains(s) || t.Content.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(t => t.IsPinned)
            .ThenByDescending(t => t.LastActivityAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new ForumTopicSummaryDto(
                t.Id,
                t.CategoryId,
                t.Category != null ? t.Category.Name : string.Empty,
                t.Category != null ? t.Category.Slug : string.Empty,
                t.MatchId,
                t.AuthorId,
                t.AuthorName,
                t.Title,
                t.Slug,
                t.IsPinned,
                t.IsLocked,
                t.ViewsCount,
                t.PostsCount,
                t.CreatedAt,
                t.LastActivityAt))
            .ToListAsync(ct);

        return Results.Ok(new
        {
            items,
            page,
            pageSize,
            total,
        });
    }

    private static async Task<IResult> GetTopicDetail(
        string idOrSlug,
        AppDbContext db,
        CancellationToken ct)
    {
        var isGuid = Guid.TryParse(idOrSlug, out var topicId);

        var topic = await db.ForumTopics
            .Include(t => t.Category)
            .Include(t => t.Match)
                .ThenInclude(m => m != null ? m.HomeTeam : null)
            .Include(t => t.Match)
                .ThenInclude(m => m != null ? m.AwayTeam : null)
            .Include(t => t.Posts.Where(p => !p.IsDeleted).OrderBy(p => p.CreatedAt))
            .FirstOrDefaultAsync(t => isGuid ? t.Id == topicId : t.Slug == idOrSlug, ct);

        if (topic is null)
            return Results.NotFound(new { message = "Topic not found" });

        // Increment view count
        topic.ViewsCount++;
        await db.SaveChangesAsync(ct);

        string? matchLabel = null;
        if (topic.Match is not null)
        {
            matchLabel = $"{topic.Match.HomeTeam?.Name ?? "Local"} vs {topic.Match.AwayTeam?.Name ?? "Visita"}";
        }

        var posts = topic.Posts
            .Select(p => new ForumPostDto(
                p.Id,
                p.TopicId,
                p.AuthorId,
                p.AuthorName,
                p.Content,
                p.CreatedAt,
                p.IsDeleted))
            .ToList();

        var dto = new ForumTopicDetailDto(
            topic.Id,
            topic.CategoryId,
            topic.Category?.Name ?? string.Empty,
            topic.Category?.Slug ?? string.Empty,
            topic.MatchId,
            matchLabel,
            topic.AuthorId,
            topic.AuthorName,
            topic.Title,
            topic.Slug,
            topic.Content,
            topic.IsPinned,
            topic.IsLocked,
            topic.ViewsCount,
            topic.PostsCount,
            topic.CreatedAt,
            topic.LastActivityAt,
            posts);

        return Results.Ok(dto);
    }

    private static async Task<IResult> GetMatchTopic(
        Guid matchId,
        AppDbContext db,
        CancellationToken ct)
    {
        // Find existing match topic or create a default thread if none exists
        var topic = await db.ForumTopics
            .Include(t => t.Category)
            .Include(t => t.Posts.Where(p => !p.IsDeleted).OrderBy(p => p.CreatedAt))
            .FirstOrDefaultAsync(t => t.MatchId == matchId, ct);

        if (topic is null)
        {
            var match = await db.Fixtures
                .Include(f => f.HomeTeam)
                .Include(f => f.AwayTeam)
                .FirstOrDefaultAsync(f => f.Id == matchId, ct);

            if (match is null)
                return Results.NotFound(new { message = "Match not found" });

            var category = await db.ForumCategories
                .FirstOrDefaultAsync(c => c.Slug == "partidos", ct)
                ?? await db.ForumCategories.FirstOrDefaultAsync(ct);

            if (category is null)
                return Results.Problem("Forum categories not initialized.", statusCode: 500);

            var homeName = match.HomeTeam?.Name ?? "Local";
            var awayName = match.AwayTeam?.Name ?? "Visita";
            var title = $"Debate: {homeName} vs {awayName}";
            var baseSlug = Slugger.Slugify(title);
            var slug = $"{baseSlug}-{match.DateUtc:yyyy-MM-dd}";

            // Check if slug exists
            if (await db.ForumTopics.AnyAsync(t => t.Slug == slug, ct))
            {
                slug = $"{slug}-{Guid.NewGuid().ToString("N")[..4]}";
            }

            topic = new ForumTopic
            {
                CategoryId = category.Id,
                MatchId = match.Id,
                AuthorId = Guid.Empty,
                AuthorName = "Azul y Oro Bot",
                Title = title,
                Slug = slug,
                Content = $"Espacio oficial de debate para el partido entre {homeName} y {awayName}. Dejá tu pronóstico, análisis de alineaciones, cambios y sensaciones del juego.",
                CreatedAt = DateTime.UtcNow,
                LastActivityAt = DateTime.UtcNow,
                PostsCount = 0,
            };

            db.ForumTopics.Add(topic);
            await db.SaveChangesAsync(ct);
        }

        var posts = (topic.Posts ?? [])
            .Select(p => new ForumPostDto(
                p.Id,
                p.TopicId,
                p.AuthorId,
                p.AuthorName,
                p.Content,
                p.CreatedAt,
                p.IsDeleted))
            .ToList();

        var dto = new ForumTopicDetailDto(
            topic.Id,
            topic.CategoryId,
            topic.Category?.Name ?? "Partidos y Plantel",
            topic.Category?.Slug ?? "partidos",
            topic.MatchId,
            topic.Title,
            topic.AuthorId,
            topic.AuthorName,
            topic.Title,
            topic.Slug,
            topic.Content,
            topic.IsPinned,
            topic.IsLocked,
            topic.ViewsCount,
            topic.PostsCount,
            topic.CreatedAt,
            topic.LastActivityAt,
            posts);

        return Results.Ok(dto);
    }

    private static async Task<IResult> CreateTopic(
        CreateTopicRequest req,
        ClaimsPrincipal principal,
        UserManager<AppUser> users,
        AppDbContext db,
        CancellationToken ct)
    {
        var user = await users.GetUserAsync(principal);
        if (user is null || !user.IsActive)
            return Results.Unauthorized();

        var modCheck = CheckUserModeration(user);
        if (modCheck is not null)
            return modCheck;

        if (string.IsNullOrWhiteSpace(req.Title) || req.Title.Length < 4)
            return Results.BadRequest(new { message = "El título debe tener al menos 4 caracteres." });

        if (string.IsNullOrWhiteSpace(req.Content) || req.Content.Length < 10)
            return Results.BadRequest(new { message = "El contenido debe tener al menos 10 caracteres." });

        var category = await db.ForumCategories.FirstOrDefaultAsync(c => c.Id == req.CategoryId && c.IsActive, ct);
        if (category is null)
            return Results.BadRequest(new { message = "Categoría no válida." });

        var baseSlug = Slugger.Slugify(req.Title);
        var uniqueSuffix = Guid.NewGuid().ToString("N")[..6];
        var slug = $"{baseSlug}-{uniqueSuffix}";

        var topic = new ForumTopic
        {
            CategoryId = category.Id,
            MatchId = req.MatchId,
            AuthorId = user.Id,
            AuthorName = user.DisplayName ?? user.UserName ?? "Xeneize",
            Title = req.Title.Trim(),
            Slug = slug,
            Content = req.Content.Trim(),
            CreatedAt = DateTime.UtcNow,
            LastActivityAt = DateTime.UtcNow,
            PostsCount = 0,
        };

        db.ForumTopics.Add(topic);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/forum/topics/{topic.Id}", new
        {
            id = topic.Id,
            slug = topic.Slug,
            title = topic.Title,
            categoryId = topic.CategoryId,
        });
    }

    private static async Task<IResult> CreatePost(
        Guid id,
        CreatePostRequest req,
        ClaimsPrincipal principal,
        UserManager<AppUser> users,
        AppDbContext db,
        CancellationToken ct)
    {
        var user = await users.GetUserAsync(principal);
        if (user is null || !user.IsActive)
            return Results.Unauthorized();

        var modCheck = CheckUserModeration(user);
        if (modCheck is not null)
            return modCheck;

        if (string.IsNullOrWhiteSpace(req.Content) || req.Content.Length < 2)
            return Results.BadRequest(new { message = "El comentario no puede estar vacío." });

        var topic = await db.ForumTopics.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (topic is null)
            return Results.NotFound(new { message = "Tema no encontrado." });

        if (topic.IsLocked)
            return Results.Problem(detail: "Este tema está cerrado para nuevas respuestas.", statusCode: StatusCodes.Status400BadRequest);

        var authorName = user.DisplayName ?? user.UserName ?? "Xeneize";

        var post = new ForumPost
        {
            TopicId = topic.Id,
            AuthorId = user.Id,
            AuthorName = authorName,
            Content = req.Content.Trim(),
            CreatedAt = DateTime.UtcNow,
        };

        topic.PostsCount++;
        topic.LastActivityAt = DateTime.UtcNow;

        db.ForumPosts.Add(post);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/forum/topics/{topic.Id}/posts/{post.Id}", new ForumPostDto(
            post.Id,
            post.TopicId,
            post.AuthorId,
            post.AuthorName,
            post.Content,
            post.CreatedAt,
            post.IsDeleted));
    }

    // --- Moderation Handlers (Admin Only) ---

    private static async Task<IResult> ModerateUser(
        ModerateUserRequest req,
        ClaimsPrincipal principal,
        UserManager<AppUser> users,
        CancellationToken ct)
    {
        var currentAdmin = await users.GetUserAsync(principal);
        if (currentAdmin is null || !await users.IsInRoleAsync(currentAdmin, AppRoles.Admin))
        {
            return Results.Problem(detail: "Acceso denegado. Se requiere rol de Administrador.", statusCode: StatusCodes.Status403Forbidden);
        }

        var targetUser = await users.FindByIdAsync(req.UserId.ToString());
        if (targetUser is null)
            return Results.NotFound(new { message = "Usuario no encontrado." });

        // Cannot moderate another admin
        if (await users.IsInRoleAsync(targetUser, AppRoles.Admin))
        {
            return Results.BadRequest(new { message = "No se puede aplicar sanciones a otros administradores." });
        }

        var action = req.Action?.Trim().ToLowerInvariant();
        var reason = req.Reason?.Trim() ?? "Incumplimiento de normas comunitarias";

        switch (action)
        {
            case "suspend":
                var days = Math.Clamp(req.Days ?? 7, 1, 365);
                targetUser.SuspendedUntil = DateTime.UtcNow.AddDays(days);
                targetUser.IsBanned = false;
                targetUser.BanReason = reason;
                break;

            case "ban":
                targetUser.IsBanned = true;
                targetUser.SuspendedUntil = null;
                targetUser.BanReason = reason;
                break;

            case "unban":
                targetUser.IsBanned = false;
                targetUser.SuspendedUntil = null;
                targetUser.BanReason = null;
                break;

            default:
                return Results.BadRequest(new { message = "Acción no válida. Usar 'suspend', 'ban' o 'unban'." });
        }

        await users.UpdateAsync(targetUser);

        return Results.Ok(new
        {
            userId = targetUser.Id,
            displayName = targetUser.DisplayName,
            email = targetUser.Email,
            actionApplied = action,
            isBanned = targetUser.IsBanned,
            suspendedUntil = targetUser.SuspendedUntil,
            banReason = targetUser.BanReason,
        });
    }

    private static async Task<IResult> GetModeratedUsers(
        ClaimsPrincipal principal,
        UserManager<AppUser> users,
        AppDbContext db,
        CancellationToken ct)
    {
        var currentAdmin = await users.GetUserAsync(principal);
        if (currentAdmin is null || !await users.IsInRoleAsync(currentAdmin, AppRoles.Admin))
        {
            return Results.Problem(detail: "Acceso denegado.", statusCode: StatusCodes.Status403Forbidden);
        }

        var now = DateTime.UtcNow;
        var moderated = await db.Users
            .AsNoTracking()
            .Where(u => u.IsBanned || (u.SuspendedUntil.HasValue && u.SuspendedUntil.Value > now))
            .OrderByDescending(u => u.IsBanned)
            .ThenByDescending(u => u.SuspendedUntil)
            .Select(u => new
            {
                id = u.Id,
                email = u.Email,
                displayName = u.DisplayName,
                isBanned = u.IsBanned,
                suspendedUntil = u.SuspendedUntil,
                banReason = u.BanReason,
                createdAt = u.CreatedAt,
            })
            .ToListAsync(ct);

        return Results.Ok(moderated);
    }

    private static IResult? CheckUserModeration(AppUser user)
    {
        if (user.IsBanned)
        {
            return Results.Problem(
                detail: $"Tu cuenta ha sido suspendida permanentemente. Motivo: {user.BanReason ?? "Violación de normas"}",
                statusCode: StatusCodes.Status403Forbidden);
        }

        if (user.IsSuspended)
        {
            return Results.Problem(
                detail: $"Tu cuenta se encuentra temporalmente suspendida hasta el {user.SuspendedUntil:dd/MM/yyyy HH:mm} UTC. Motivo: {user.BanReason ?? "Violación de normas"}",
                statusCode: StatusCodes.Status403Forbidden);
        }

        return null;
    }
}
