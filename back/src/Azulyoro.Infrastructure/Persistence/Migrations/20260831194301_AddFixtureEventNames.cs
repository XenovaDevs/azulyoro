using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Azulyoro.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFixtureEventNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "assist_name",
                schema: "app",
                table: "fixture_events",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "player_name",
                schema: "app",
                table: "fixture_events",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "team_name",
                schema: "app",
                table: "fixture_events",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "assist_name",
                schema: "app",
                table: "fixture_events");

            migrationBuilder.DropColumn(
                name: "player_name",
                schema: "app",
                table: "fixture_events");

            migrationBuilder.DropColumn(
                name: "team_name",
                schema: "app",
                table: "fixture_events");
        }
    }
}
