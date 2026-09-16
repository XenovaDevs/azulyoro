using Azulyoro.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Azulyoro.Infrastructure.Persistence.Configurations;

public class ForumCategoryConfiguration : IEntityTypeConfiguration<ForumCategory>
{
    public void Configure(EntityTypeBuilder<ForumCategory> b)
    {
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.Slug).IsUnique();
        b.Property(x => x.Name).HasMaxLength(100).IsRequired();
        b.Property(x => x.Slug).HasMaxLength(120).IsRequired();
        b.Property(x => x.Description).HasMaxLength(500);
        b.Property(x => x.Icon).HasMaxLength(50);
    }
}

public class ForumTopicConfiguration : IEntityTypeConfiguration<ForumTopic>
{
    public void Configure(EntityTypeBuilder<ForumTopic> b)
    {
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.Slug).IsUnique();
        b.HasIndex(x => x.CategoryId);
        b.HasIndex(x => x.MatchId);
        b.HasIndex(x => x.LastActivityAt);
        b.Property(x => x.Title).HasMaxLength(200).IsRequired();
        b.Property(x => x.Slug).HasMaxLength(220).IsRequired();
        b.Property(x => x.AuthorName).HasMaxLength(100).IsRequired();

        b.HasOne(x => x.Category)
            .WithMany(c => c.Topics)
            .HasForeignKey(x => x.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        b.HasOne(x => x.Match)
            .WithMany()
            .HasForeignKey(x => x.MatchId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

public class ForumPostConfiguration : IEntityTypeConfiguration<ForumPost>
{
    public void Configure(EntityTypeBuilder<ForumPost> b)
    {
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.TopicId);
        b.HasIndex(x => x.AuthorId);
        b.Property(x => x.AuthorName).HasMaxLength(100).IsRequired();

        b.HasOne(x => x.Topic)
            .WithMany(t => t.Posts)
            .HasForeignKey(x => x.TopicId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
