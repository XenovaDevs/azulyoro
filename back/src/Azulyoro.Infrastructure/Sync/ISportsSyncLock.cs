namespace Azulyoro.Infrastructure.Sync;

/// <summary>Coordinates live updates with scheduled ingestion across server processes.</summary>
public interface ISportsSyncLock
{
    IDisposable? TryAcquire();
}
