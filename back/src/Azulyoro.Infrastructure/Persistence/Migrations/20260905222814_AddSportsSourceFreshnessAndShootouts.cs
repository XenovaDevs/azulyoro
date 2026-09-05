using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Azulyoro.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSportsSourceFreshnessAndShootouts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "source_updated_at_utc",
                schema: "app",
                table: "standings",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "extra_time_away",
                schema: "app",
                table: "fixtures",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "extra_time_home",
                schema: "app",
                table: "fixtures",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "penalty_away",
                schema: "app",
                table: "fixtures",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "penalty_home",
                schema: "app",
                table: "fixtures",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "source_updated_at_utc",
                schema: "app",
                table: "standings");

            migrationBuilder.DropColumn(
                name: "extra_time_away",
                schema: "app",
                table: "fixtures");

            migrationBuilder.DropColumn(
                name: "extra_time_home",
                schema: "app",
                table: "fixtures");

            migrationBuilder.DropColumn(
                name: "penalty_away",
                schema: "app",
                table: "fixtures");

            migrationBuilder.DropColumn(
                name: "penalty_home",
                schema: "app",
                table: "fixtures");
        }
    }
}
