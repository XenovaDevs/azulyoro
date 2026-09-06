using Azulyoro.Domain.Common;
using Azulyoro.Domain.Entities;
using Azulyoro.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Azulyoro.Infrastructure.Persistence;

/// <summary>
/// Root EF Core context (ASP.NET Identity + app data). Application tables live
/// under the "app" schema; Hangfire manages its own "hangfire" schema.
/// </summary>
public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>(options)
{
    public const string Schema = "app";

    public DbSet<Season> Seasons => Set<Season>();
    public DbSet<Competition> Competitions => Set<Competition>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<Player> Players => Set<Player>();
    public DbSet<Fixture> Fixtures => Set<Fixture>();
    public DbSet<FixtureEvent> FixtureEvents => Set<FixtureEvent>();
    public DbSet<FixtureLineup> FixtureLineups => Set<FixtureLineup>();
    public DbSet<FixtureLineupPlayer> FixtureLineupPlayers => Set<FixtureLineupPlayer>();
    public DbSet<FixturePlayerStats> FixturePlayerStats => Set<FixturePlayerStats>();
    public DbSet<FixtureTeamStatistic> FixtureTeamStatistics => Set<FixtureTeamStatistic>();
    public DbSet<PlayerSeasonStats> PlayerSeasonStats => Set<PlayerSeasonStats>();
    public DbSet<Standing> Standings => Set<Standing>();
    public DbSet<SyncState> SyncStates => Set<SyncState>();

    public DbSet<Source> Sources => Set<Source>();
    public DbSet<StagingArticle> StagingArticles => Set<StagingArticle>();
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<ArticleTranslation> ArticleTranslations => Set<ArticleTranslation>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<ArticleTag> ArticleTags => Set<ArticleTag>();

    public DbSet<NewsletterSubscriber> NewsletterSubscribers => Set<NewsletterSubscriber>();
    public DbSet<LegalPage> LegalPages => Set<LegalPage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Identity model must be configured first.
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasDefaultSchema(Schema);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // PKs are app-generated UUID v7; never let the store overwrite them.
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(Entity).IsAssignableFrom(entity.ClrType))
            {
                modelBuilder.Entity(entity.ClrType)
                    .Property(nameof(Entity.Id))
                    .ValueGeneratedNever();
            }
        }
    }

    public override int SaveChanges()
    {
        StampTimestamps();
        return base.SaveChanges();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        StampTimestamps();
        return base.SaveChangesAsync(cancellationToken);
    }

    private void StampTimestamps()
    {
        var now = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries<Entity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = now;
                entry.Entity.UpdatedAt = now;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = now;
            }
        }
    }
}
