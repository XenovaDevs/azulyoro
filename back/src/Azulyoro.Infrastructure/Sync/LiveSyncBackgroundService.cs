using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Azulyoro.Infrastructure.Sync;

/// <summary>
/// Single-provider heartbeat that watches today's fixtures for kickoff,
/// in-play changes and the final result. Connected clients consume the
/// resulting fan-out rather than polling the provider themselves.
/// </summary>
public class LiveSyncBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<LiveSyncBackgroundService> logger,
    IOptions<SportsSyncOptions> options,
    ISportsSyncLock? syncLock = null)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalSeconds = Math.Clamp(options.Value.LivePollIntervalSeconds, 15, 300);
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(intervalSeconds));
        do
        {
            try
            {
                using var lease = syncLock?.TryAcquire();
                if (syncLock is not null && lease is null) continue;
                using var scope = scopeFactory.CreateScope();
                var sync = scope.ServiceProvider.GetRequiredService<LiveSyncService>();
                var polled = await sync.PollOnceAsync(stoppingToken);
                if (polled > 0)
                {
                    logger.LogDebug("Live sync polled {Count} live fixture(s).", polled);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Live sync poll failed; will retry next tick.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
