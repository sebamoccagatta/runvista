import { EventEmitter } from 'node:events';
import type { ServerResponse } from 'node:http';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { overlayEventBus } from './overlay-events.js';
import { OVERLAY_STREAM_CONFIG } from './overlay-stream.config.js';
import { createOverlayStream } from './overlay-stream.js';

const runId = 'stream-unit-run';
const overlayId = 'stream-unit-overlay';

function setup() {
  const response = Object.assign(new EventEmitter(), {
    destroyed: false,
    writableEnded: false,
    writableLength: 0,
    write: vi.fn().mockReturnValue(true),
    end: vi.fn(),
    destroy: vi.fn(),
  });

  const stream = createOverlayStream({
    response: response as unknown as ServerResponse,
    runId,
    overlayId,
  });

  return { response, stream };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  overlayEventBus.shutdown();
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('Overlay stream resource management', () => {
  it('destroys a connection that signals backpressure', () => {
    const { response, stream } = setup();
    response.write.mockReturnValueOnce(false);
    stream.sendConnected();

    expect(response.destroy).toHaveBeenCalledOnce();
    expect(stream.isClosed()).toBe(true);
    expect(overlayEventBus.getSubscriberCount(runId)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(response.write).toHaveBeenCalledOnce();
  });

  it('destroys a connection before exceeding the buffer limit', () => {
    const { response, stream } = setup();
    response.writableLength = OVERLAY_STREAM_CONFIG.maxBufferedBytes;
    stream.sendConnected();

    expect(response.write).not.toHaveBeenCalled();
    expect(response.destroy).toHaveBeenCalledOnce();
    expect(stream.isClosed()).toBe(true);
    expect(overlayEventBus.getSubscriberCount(runId)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears the heartbeat when the client disconnects', () => {
    const { response, stream } = setup();
    stream.sendConnected();
    response.write.mockClear();

    vi.advanceTimersByTime(OVERLAY_STREAM_CONFIG.heartbeatIntervalMs);
    expect(response.write).toHaveBeenCalledWith(': heartbeat\n\n');

    response.emit('close');
    response.write.mockClear();
    vi.advanceTimersByTime(OVERLAY_STREAM_CONFIG.heartbeatIntervalMs * 2);

    expect(response.write).not.toHaveBeenCalled();
    expect(stream.isClosed()).toBe(true);
    expect(overlayEventBus.getSubscriberCount(runId)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases resources when writing throws', () => {
    const { response, stream } = setup();
    response.write.mockImplementationOnce(() => {
      throw new Error('Socket unavailable');
    });

    stream.sendConnected();

    expect(response.destroy).toHaveBeenCalledOnce();
    expect(stream.isClosed()).toBe(true);
    expect(overlayEventBus.getSubscriberCount(runId)).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
