using Azulyoro.Api.Features.Admin;
using Azulyoro.Infrastructure.Sync;
using Hangfire;
using Hangfire.PostgreSql;

namespace Azulyoro.Api.Configuration;

public static class HangfireSetup
{
    public static IServiceCollection AddAppHangfire(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("Connection string 'Postgres' is required for Hangfire.");

        services.AddHangfire(config => config
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UsePostgreSqlStorage(
                options => options.UseNpgsqlConnection(connectionString),
                new PostgreSqlStorageOptions { SchemaName = "hangfire" }));

        services.AddHangfireServer();
        services.AddScoped<SyncJobs>();
        services.AddScoped<ScrapeArticlesJob>();
        services.AddSingleton<ISportsSyncLock, HangfireSportsSyncLock>();

        return services;
    }

    public static WebApplication UseAppHangfire(this WebApplication app)
    {
        app.UseHangfireDashboard("/hangfire", new DashboardOptions
        {
            Authorization = [new HangfireDashboardAuthFilter(app.Environment)],
        });

        // Two uniform refreshes per hour; live scores use the separate heartbeat.
        RecurringJob.AddOrUpdate<SyncJobs>(
            SyncJobs.StaticJobId, job => job.SyncStaticAsync(CancellationToken.None), Cron.Daily);
        RecurringJob.AddOrUpdate<SyncJobs>(
            SyncJobs.SemiJobId, job => job.SyncSemiAsync(CancellationToken.None), "*/30 * * * *");
        RecurringJob.AddOrUpdate<SyncJobs>(
            SyncJobs.FixtureDetailsJobId, job => job.SyncFixtureDetailsAsync(CancellationToken.None), "*/30 * * * *");
        RecurringJob.AddOrUpdate<ScrapeArticlesJob>(
            ScrapeArticlesJob.JobId, job => job.RunAsync(CancellationToken.None), "*/20 * * * *");

        // Populate newly supported competitions immediately after a deployment.
        RecurringJob.TriggerJob(SyncJobs.SemiJobId);

        return app;
    }
}
