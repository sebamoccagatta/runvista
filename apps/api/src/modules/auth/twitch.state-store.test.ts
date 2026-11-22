import { describe, expect, it } from 'vitest';

import { TwitchOAuthStateStore } from './twitch.state-store.js';

describe('TwitchOAuthStateStore', () => {
  it('generates a cryptographic state', () => {
    const store = new TwitchOAuthStateStore();

    const state = store.issue();

    expect(state).toMatch(/^[a-f0-9]{64}$/);
  });

  it('generates different states', () => {
    const store = new TwitchOAuthStateStore();

    expect(store.issue()).not.toBe(store.issue());
  });

  it('consumes a valid state only once', () => {
    const store = new TwitchOAuthStateStore();

    const state = store.issue();

    expect(store.consume(state)).toBe(true);
    expect(store.consume(state)).toBe(false);
  });

  it('rejects unknown states', () => {
    const store = new TwitchOAuthStateStore();

    expect(store.consume('a'.repeat(64))).toBe(false);
  });

  it('rejects expired states', () => {
    let currentTime = 1_000;

    const store = new TwitchOAuthStateStore(600_000, () => currentTime);

    const state = store.issue();

    currentTime += 600_001;

    expect(store.consume(state)).toBe(false);
  });

  it('allows a valid state before expiration', () => {
    let currentTime = 1_000;

    const store = new TwitchOAuthStateStore(600_000, () => currentTime);

    const state = store.issue();

    currentTime += 300_000;

    expect(store.consume(state)).toBe(true);
  });
});
