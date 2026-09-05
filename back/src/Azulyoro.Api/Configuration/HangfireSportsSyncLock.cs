using Azulyoro.Infrastructure.Sync;
using Hangfire;
using Hangfire.Storage;

namespace Azulyoro.Api.Configuration;

public sealed class HangfireSportsSyncLock : ISportsSyncLock
{
    public IDisposable? TryAcquire()
    {
        var connection = JobStorage.Current.GetConnection();
        try
        {
            var lease = connection.AcquireDistributedLock("azulyoro:sports-sync", TimeSpan.FromSeconds(1));
            return new LockLease(lease, connection);
        }
        catch (DistributedLockTimeoutException)
        {
            connection.Dispose();
            return null;
        }
        catch
        {
            connection.Dispose();
            throw;
        }
    }

    private sealed class LockLease(IDisposable lease, IDisposable connection) : IDisposable
    {
        public void Dispose()
        {
            try { lease.Dispose(); }
            finally { connection.Dispose(); }
        }
    }
}
