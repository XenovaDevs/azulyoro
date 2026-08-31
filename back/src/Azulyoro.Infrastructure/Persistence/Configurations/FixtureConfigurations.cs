using Azulyoro.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Azulyoro.Infrastructure.Persistence.Configurations;

public class FixtureConfiguration : IEntityTypeConfiguration<Fixture>
{
    public void Configure(EntityTypeBuilder<Fixture> b)
    {
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.ExtId).IsUnique();
        b.HasIndex(x => x.DateUtc);
        b.HasIndex(x => x.Status);
        b.HasIndex(x => new { x.IsBoca, x.DateUtc });

        b.Property(x => x.Round).HasMaxLength(80);
        b.Property(x => x.VenueName).HasMaxLength(120);
        b.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);

        b.HasOne(x => x.Competition).WithMany()
            .HasForeignKey(x => x.CompetitionId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.Season).WithMany()
            .HasForeignKey(x => x.SeasonId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.HomeTeam).WithMany()
            .HasForeignKey(x => x.HomeTeamId).OnDelete(DeleteBehavior.Restrict);
        b.HasOne(x => x.AwayTeam).WithMany()
            .HasForeignKey(x => x.AwayTeamId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class FixtureEventConfiguration : IEntityTypeConfiguration<FixtureEvent>
{
    public void Configure(EntityTypeBuilder<FixtureEvent> b)
    {
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.FixtureId, x.ExtSeq }).IsUnique();
        b.Property(x => x.Type).HasConversion<string>().HasMaxLength(16);
        b.Property(x => x.Detail).HasMaxLength(120);
        b.Property(x => x.Comments).HasMaxLength(200);
        b.Property(x => x.PlayerName).HasMaxLength(120);
        b.Property(x => x.AssistName).HasMaxLength(120);
        b.Property(x => x.TeamName).HasMaxLength(120);

        b.HasOne(x => x.Fixture).WithMany(f => f.Events)
            .HasForeignKey(x => x.FixtureId).OnDelete(DeleteBehavior.Cascade);
        // TeamId / PlayerId / AssistPlayerId are loose refs (no FK).
    }
}

public class FixtureLineupConfiguration : IEntityTypeConfiguration<FixtureLineup>
{
    public void Configure(EntityTypeBuilder<FixtureLineup> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Formation).HasMaxLength(20);
        b.Property(x => x.CoachName).HasMaxLength(120);

        b.HasOne(x => x.Fixture).WithMany(f => f.Lineups)
            .HasForeignKey(x => x.FixtureId).OnDelete(DeleteBehavior.Cascade);
        b.HasOne(x => x.Team).WithMany()
            .HasForeignKey(x => x.TeamId).OnDelete(DeleteBehavior.Restrict);
    }
}

public class FixtureLineupPlayerConfiguration : IEntityTypeConfiguration<FixtureLineupPlayer>
{
    public void Configure(EntityTypeBuilder<FixtureLineupPlayer> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Grid).HasMaxLength(12);

        b.HasOne(x => x.Lineup).WithMany(l => l.Players)
            .HasForeignKey(x => x.LineupId).OnDelete(DeleteBehavior.Cascade);
        // PlayerId is a loose ref (opponent players are not ingested).
    }
}

public class FixturePlayerStatsConfiguration : IEntityTypeConfiguration<FixturePlayerStats>
{
    public void Configure(EntityTypeBuilder<FixturePlayerStats> b)
    {
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.FixtureId, x.PlayerId });
        b.Property(x => x.Rating).HasPrecision(5, 2);

        b.HasOne(x => x.Fixture).WithMany(f => f.PlayerStats)
            .HasForeignKey(x => x.FixtureId).OnDelete(DeleteBehavior.Cascade);
        // PlayerId / TeamId are loose refs.
    }
}
