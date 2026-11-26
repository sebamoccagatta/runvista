import { describe, expect, it, vi } from 'vitest';

import { OverlayEventBus } from './overlay-events.js';

describe('OverlayEventBus', () => {
  it('notifies subscribers when a team is published', () => {
    const bus = new OverlayEventBus();
    const listener = vi.fn();

    bus.subscribe('run-1', listener);
    bus.publishTeam('run-1', 2);

    expect(listener).toHaveBeenCalledWith({
      type: 'team-published',
      runId: 'run-1',
      version: 2,
    });
  });

  it('does not notify other runs', () => {
    const bus = new OverlayEventBus();
    const listener = vi.fn();

    bus.subscribe('run-2', listener);
    bus.publishTeam('run-1', 1);

    expect(listener).not.toHaveBeenCalled();
  });

  it('supports multiple overlays for the same run', () => {
    const bus = new OverlayEventBus();
    const first = vi.fn();
    const second = vi.fn();

    bus.subscribe('run-1', first);
    bus.subscribe('run-1', second);

    bus.publishTeam('run-1', 3);

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('stops notifying unsubscribed listeners', () => {
    const bus = new OverlayEventBus();
    const listener = vi.fn();

    const unsubscribe = bus.subscribe('run-1', listener);

    unsubscribe();
    bus.publishTeam('run-1', 4);

    expect(listener).not.toHaveBeenCalled();
  });

  it('notifies when overlay access is revoked', () => {
    const bus = new OverlayEventBus();
    const listener = vi.fn();

    bus.subscribe('run-1', listener);
    bus.revokeOverlay('run-1', 'overlay-1');

    expect(listener).toHaveBeenCalledWith({
      type: 'access-revoked',
      overlayId: 'overlay-1',
    });
  });

  it('does not interrupt other listeners if one fails', () => {
    const bus = new OverlayEventBus();
    const healthyListener = vi.fn();

    bus.subscribe('run-1', () => {
      throw new Error('Disconnected listener');
    });

    bus.subscribe('run-1', healthyListener);

    expect(() => bus.publishTeam('run-1', 5)).not.toThrow();
    expect(healthyListener).toHaveBeenCalledOnce();
  });

  it('allows unsubscribing more than once', () => {
    const bus = new OverlayEventBus();
    const listener = vi.fn();

    const unsubscribe = bus.subscribe('run-1', listener);

    unsubscribe();
    unsubscribe();

    bus.publishTeam('run-1', 6);

    expect(listener).not.toHaveBeenCalled();
  });

  it('counts subscribers for an individual run', () => {
    const bus = new OverlayEventBus();

    bus.subscribe('run-1', vi.fn());
    bus.subscribe('run-1', vi.fn());
    bus.subscribe('run-2', vi.fn());

    expect(bus.getSubscriberCount('run-1')).toBe(2);
    expect(bus.getSubscriberCount('run-2')).toBe(1);
    expect(bus.getSubscriberCount('unknown')).toBe(0);
  });

  it('counts all active subscribers', () => {
    const bus = new OverlayEventBus();

    bus.subscribe('run-1', vi.fn());
    bus.subscribe('run-2', vi.fn());
    bus.subscribe('run-3', vi.fn());

    expect(bus.getTotalSubscriberCount()).toBe(3);
  });

  it('decreases subscriber counts after disconnection', () => {
    const bus = new OverlayEventBus();

    const unsubscribe = bus.subscribe('run-1', vi.fn());

    expect(bus.getTotalSubscriberCount()).toBe(1);

    unsubscribe();

    expect(bus.getSubscriberCount('run-1')).toBe(0);
    expect(bus.getTotalSubscriberCount()).toBe(0);
  });

  it('notifies every subscriber when a run is deleted', () => {
    const bus = new OverlayEventBus();

    const first = vi.fn();
    const second = vi.fn();

    bus.subscribe('run-1', first);
    bus.subscribe('run-1', second);

    bus.deleteRun('run-1');

    expect(first).toHaveBeenCalledWith({
      type: 'run-deleted',
      runId: 'run-1',
    });

    expect(second).toHaveBeenCalledWith({
      type: 'run-deleted',
      runId: 'run-1',
    });

    expect(bus.getSubscriberCount('run-1')).toBe(0);
  });

  it('does not affect other runs when deleting a run', () => {
    const bus = new OverlayEventBus();

    const first = vi.fn();
    const second = vi.fn();

    bus.subscribe('run-1', first);
    bus.subscribe('run-2', second);

    bus.deleteRun('run-1');

    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();

    expect(bus.getSubscriberCount('run-1')).toBe(0);
    expect(bus.getSubscriberCount('run-2')).toBe(1);
  });

  it('notifies all subscribers during server shutdown', () => {
    const bus = new OverlayEventBus();

    const first = vi.fn();
    const second = vi.fn();

    bus.subscribe('run-1', first);
    bus.subscribe('run-2', second);

    bus.shutdown();

    expect(first).toHaveBeenCalledWith({
      type: 'server-shutdown',
    });

    expect(second).toHaveBeenCalledWith({
      type: 'server-shutdown',
    });

    expect(bus.getTotalSubscriberCount()).toBe(0);
  });

  it('does not notify removed subscribers after shutdown', () => {
    const bus = new OverlayEventBus();
    const listener = vi.fn();

    bus.subscribe('run-1', listener);

    bus.shutdown();

    listener.mockClear();

    bus.publishTeam('run-1', 10);

    expect(listener).not.toHaveBeenCalled();
  });

  it('does not remove a new subscription when old cleanup repeats', () => {
    const bus = new OverlayEventBus();
    const listener = vi.fn();

    const unsubscribe = bus.subscribe('run-1', listener);

    unsubscribe();

    bus.subscribe('run-1', listener);

    unsubscribe();

    expect(bus.getSubscriberCount('run-1')).toBe(1);

    bus.publishTeam('run-1', 11);

    expect(listener).toHaveBeenCalledOnce();
  });
});
