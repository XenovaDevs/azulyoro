using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Azulyoro.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddForumAndUserModeration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ban_reason",
                schema: "app",
                table: "AspNetUsers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_banned",
                schema: "app",
                table: "AspNetUsers",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "suspended_until",
                schema: "app",
                table: "AspNetUsers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "forum_categories",
                schema: "app",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    slug = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    icon = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    display_order = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_forum_categories", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "forum_topics",
                schema: "app",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    category_id = table.Column<Guid>(type: "uuid", nullable: false),
                    match_id = table.Column<Guid>(type: "uuid", nullable: true),
                    author_id = table.Column<Guid>(type: "uuid", nullable: false),
                    author_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    slug = table.Column<string>(type: "character varying(220)", maxLength: 220, nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    is_pinned = table.Column<bool>(type: "boolean", nullable: false),
                    is_locked = table.Column<bool>(type: "boolean", nullable: false),
                    views_count = table.Column<int>(type: "integer", nullable: false),
                    posts_count = table.Column<int>(type: "integer", nullable: false),
                    last_activity_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_forum_topics", x => x.id);
                    table.ForeignKey(
                        name: "fk_forum_topics_fixtures_match_id",
                        column: x => x.match_id,
                        principalSchema: "app",
                        principalTable: "fixtures",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "fk_forum_topics_forum_categories_category_id",
                        column: x => x.category_id,
                        principalSchema: "app",
                        principalTable: "forum_categories",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "forum_posts",
                schema: "app",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    topic_id = table.Column<Guid>(type: "uuid", nullable: false),
                    author_id = table.Column<Guid>(type: "uuid", nullable: false),
                    author_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    content = table.Column<string>(type: "text", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_forum_posts", x => x.id);
                    table.ForeignKey(
                        name: "fk_forum_posts_forum_topics_topic_id",
                        column: x => x.topic_id,
                        principalSchema: "app",
                        principalTable: "forum_topics",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_forum_categories_slug",
                schema: "app",
                table: "forum_categories",
                column: "slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_forum_posts_author_id",
                schema: "app",
                table: "forum_posts",
                column: "author_id");

            migrationBuilder.CreateIndex(
                name: "ix_forum_posts_topic_id",
                schema: "app",
                table: "forum_posts",
                column: "topic_id");

            migrationBuilder.CreateIndex(
                name: "ix_forum_topics_category_id",
                schema: "app",
                table: "forum_topics",
                column: "category_id");

            migrationBuilder.CreateIndex(
                name: "ix_forum_topics_last_activity_at",
                schema: "app",
                table: "forum_topics",
                column: "last_activity_at");

            migrationBuilder.CreateIndex(
                name: "ix_forum_topics_match_id",
                schema: "app",
                table: "forum_topics",
                column: "match_id");

            migrationBuilder.CreateIndex(
                name: "ix_forum_topics_slug",
                schema: "app",
                table: "forum_topics",
                column: "slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "forum_posts",
                schema: "app");

            migrationBuilder.DropTable(
                name: "forum_topics",
                schema: "app");

            migrationBuilder.DropTable(
                name: "forum_categories",
                schema: "app");

            migrationBuilder.DropColumn(
                name: "ban_reason",
                schema: "app",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "is_banned",
                schema: "app",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "suspended_until",
                schema: "app",
                table: "AspNetUsers");
        }
    }
}
