export const OVERLAY_STREAM_CONFIG = Object.freeze({
  maxConnectionsPerRun: 20,
  maxConnectionsTotal: 500,
  heartbeatIntervalMs: 25_000,
  retryAfterSeconds: 10,
  maxBufferedBytes: 64 * 1024,
});
