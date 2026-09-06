using System.Collections.Concurrent;
using System.Threading.Channels;

namespace Azulyoro.Infrastructure.Sync;

/// <summary>
/// In-process fan-out for public live-fixture updates. The provider is polled
/// once by the background worker; connected browsers consume the same update
/// instead of causing one upstream request per visitor.
/// </summary>
public sealed class LiveUpdateHub
{
    private readonly ConcurrentDictionary<Guid, ConcurrentDictionary<Guid, Channel<LiveFixtureUpdate>>> _subscribers = new();

    public LiveUpdateSubscription Subscribe(Guid fixtureId)
    {
        var channel = Channel.CreateBounded<LiveFixtureUpdate>(new BoundedChannelOptions(8)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false,
        });
        var subscriptionId = Guid.CreateVersion7();
        var fixtureSubscribers = _subscribers.GetOrAdd(fixtureId, static _ => new());
        fixtureSubscribers[subscriptionId] = channel;
        return new LiveUpdateSubscription(
            channel.Reader,
            () => Remove(fixtureId, subscriptionId, channel));
    }

    public void Publish(LiveFixtureUpdate update)
    {
        if (!_subscribers.TryGetValue(update.FixtureId, out var fixtureSubscribers))
        {
            return;
        }

        foreach (var channel in fixtureSubscribers.Values)
        {
            channel.Writer.TryWrite(update);
        }
    }

    private void Remove(
        Guid fixtureId,
        Guid subscriptionId,
        Channel<LiveFixtureUpdate> channel)
    {
        if (_subscribers.TryGetValue(fixtureId, out var fixtureSubscribers))
        {
            fixtureSubscribers.TryRemove(
                new KeyValuePair<Guid, Channel<LiveFixtureUpdate>>(subscriptionId, channel));
            if (fixtureSubscribers.IsEmpty)
            {
                _subscribers.TryRemove(
                    new KeyValuePair<Guid, ConcurrentDictionary<Guid, Channel<LiveFixtureUpdate>>>(
                        fixtureId, fixtureSubscribers));
            }
        }

        channel.Writer.TryComplete();
    }
}

public sealed class LiveUpdateSubscription(
    ChannelReader<LiveFixtureUpdate> reader,
    Action dispose) : IAsyncDisposable
{
    public IAsyncEnumerable<LiveFixtureUpdate> ReadAllAsync(CancellationToken ct) =>
        reader.ReadAllAsync(ct);

    public ValueTask DisposeAsync()
    {
        dispose();
        return ValueTask.CompletedTask;
    }
}

public sealed record LiveFixtureUpdate(
    Guid FixtureId,
    string Status,
    int? Elapsed,
    int? HomeGoals,
    int? AwayGoals,
    IReadOnlyList<LiveEventUpdate> Events,
    MatchStatisticsDto? TeamStats = null);

public sealed record LiveEventUpdate(
    int Minute,
    int? ExtraMinute,
    string Type,
    string? Detail,
    string? TeamName,
    string? PlayerName,
    string? AssistName);
