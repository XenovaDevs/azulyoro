using System.Security.Cryptography.X509Certificates;
using Azulyoro.Api.Configuration;
using Microsoft.AspNetCore.DataProtection;
using Azulyoro.Api.Features.Admin;
using Azulyoro.Api.Features.Articles;
using Azulyoro.Api.Features.Auth;
using Azulyoro.Api.Features.Competitions;
using Azulyoro.Api.Features.Forum;
using Azulyoro.Api.Features.Legal;
using Azulyoro.Api.Features.Matches;
using Azulyoro.Api.Features.Members;
using Azulyoro.Api.Features.Newsletter;
using Azulyoro.Api.Features.Players;
using Azulyoro.Api.Features.Standings;
using Azulyoro.Infrastructure;
using Azulyoro.Infrastructure.Content;
using Azulyoro.Infrastructure.Persistence;
using Hangfire;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMemoryCache();

var dataProtection = builder.Services
    .AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(
        builder.Configuration["DataProtection:KeysPath"] ?? "/var/lib/azulyoro/keys"));

if (builder.Environment.IsProduction())
{
    var certificatePath = builder.Configuration["DataProtection:CertificatePath"];
    var certificateKeyPath = builder.Configuration["DataProtection:CertificateKeyPath"];
    if (string.IsNullOrWhiteSpace(certificatePath) || string.IsNullOrWhiteSpace(certificateKeyPath))
    {
        throw new InvalidOperationException(
            "DataProtection certificate and private-key paths are required in Production.");
    }

    var certificate = X509Certificate2.CreateFromPemFile(certificatePath, certificateKeyPath);
    dataProtection.ProtectKeysWithCertificate(certificate);
}

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddAppIdentity(builder.Configuration);
builder.Services.AddApiHardening(builder.Configuration);
builder.Services.AddAppHangfire(builder.Configuration);

var app = builder.Build();

// The deploy pipeline runs migrations in a short-lived, isolated systemd
// unit before switching the live release. Normal web workers never migrate
// the database during request-serving startup.
if (builder.Configuration.GetValue<bool>("Database:MigrateOnly"))
{
    using var migrationScope = app.Services.CreateScope();
    var db = migrationScope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    return;
}

app.UseApiHardening();

app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Baseline seed (ALL environments): roles, legal pages and news sources are
// essential content, not dev fixtures. Only the fake sports data is dev-only.
using (var seedScope = app.Services.CreateScope())
{
    var db = seedScope.ServiceProvider.GetRequiredService<AppDbContext>();
    await IdentitySetup.SeedRolesAsync(seedScope.ServiceProvider);
    await LegalSeeder.SeedLegalAsync(db, CancellationToken.None);
    await ContentSeeder.SeedSourcesAsync(db, CancellationToken.None);
    await ForumSeeder.SeedForumCategoriesAsync(db, CancellationToken.None);

    if (app.Environment.IsDevelopment())
    {
        // Representative sports data so the API is verifiable without the
        // external API-Football key.
        await DevDataSeeder.SeedAsync(db, CancellationToken.None);
    }
}

app.MapGet("/health", () => Results.Ok(new { status = "ok" }))
    .WithName("HealthCheck");

app.MapMatchesEndpoints();
app.MapPlayersEndpoints();
app.MapStandingsEndpoints();
app.MapCompetitionsEndpoints();
app.MapArticlesEndpoints();
app.MapContentAdminEndpoints();
app.MapAuthEndpoints();
app.MapNewsletterEndpoints();
app.MapLegalEndpoints();
app.MapMembersEndpoints();
app.MapForumEndpoints();

app.UseAppHangfire();

// Dev-only endpoints: exercise the sensitive rate-limit policy and let us
// enqueue a sync job through Hangfire to confirm the pipeline executes.
if (app.Environment.IsDevelopment())
{
    app.MapPost("/api/dev/rate-test", () => Results.Ok())
        .RequireRateLimiting(ApiHardening.SensitivePolicy);

    app.MapPost("/api/dev/run-sync", (Hangfire.IBackgroundJobClient jobs) =>
    {
        jobs.Enqueue<Azulyoro.Api.Features.Admin.SyncJobs>(
            j => j.SyncStaticAsync(CancellationToken.None));
        return Results.Accepted();
    });

    app.MapPost("/api/dev/sync-fixture-details", (Hangfire.IBackgroundJobClient jobs) =>
    {
        jobs.Enqueue<Azulyoro.Api.Features.Admin.SyncJobs>(
            j => j.SyncFixtureDetailsAsync(CancellationToken.None));
        return Results.Accepted();
    });
}

app.Run();
