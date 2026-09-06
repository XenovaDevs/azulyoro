using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Azulyoro.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFixtureTeamStatistics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "detail_last_attempt_at",
                schema: "app",
                table: "fixtures",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "team_statistics_updated_at",
                schema: "app",
                table: "fixtures",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "fixture_team_statistics",
                schema: "app",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    fixture_id = table.Column<Guid>(type: "uuid", nullable: false),
                    team_id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    value = table.Column<decimal>(type: "numeric(12,4)", precision: 12, scale: 4, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_fixture_team_statistics", x => x.id);
                    table.ForeignKey(
                        name: "fk_fixture_team_statistics_fixtures_fixture_id",
                        column: x => x.fixture_id,
                        principalSchema: "app",
                        principalTable: "fixtures",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_fixture_team_statistics_teams_team_id",
                        column: x => x.team_id,
                        principalSchema: "app",
                        principalTable: "teams",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_fixture_team_statistics_fixture_id_team_id_key",
                schema: "app",
                table: "fixture_team_statistics",
                columns: new[] { "fixture_id", "team_id", "key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_fixture_team_statistics_team_id",
                schema: "app",
                table: "fixture_team_statistics",
                column: "team_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "fixture_team_statistics",
                schema: "app");

            migrationBuilder.DropColumn(
                name: "detail_last_attempt_at",
                schema: "app",
                table: "fixtures");

            migrationBuilder.DropColumn(
                name: "team_statistics_updated_at",
                schema: "app",
                table: "fixtures");
        }
    }
}
