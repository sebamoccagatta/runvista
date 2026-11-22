import { generateOAuthState } from './twitch.oauth.js';

const DEFAULT_TTL_MS = 10 * 60 * 1000;
const MAX_PENDING_STATES = 1_000;

export class TwitchOAuthStateStore {
  private readonly pending = new Map<string, number>();

  constructor(
    private readonly ttlMs = DEFAULT_TTL_MS,
    private readonly now: () => number = Date.now,
  ) {}

  issue(): string {
    this.removeExpired();

    if (this.pending.size >= MAX_PENDING_STATES) {
      throw new Error('Too many pending OAuth requests');
    }

    let state: string;

    do {
      state = generateOAuthState();
    } while (this.pending.has(state));

    this.pending.set(state, this.now() + this.ttlMs);

    return state;
  }

  consume(state: string): boolean {
    const expiresAt = this.pending.get(state);

    if (expiresAt === undefined) {
      return false;
    }

    // Eliminamos el state incluso si ya expiró.
    this.pending.delete(state);

    return expiresAt > this.now();
  }

  private removeExpired(): void {
    const currentTime = this.now();

    for (const [state, expiresAt] of this.pending) {
      if (expiresAt <= currentTime) {
        this.pending.delete(state);
      }
    }
  }
}
