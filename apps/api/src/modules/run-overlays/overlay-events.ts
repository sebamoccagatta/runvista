export type OverlayEvent =
  | {
      type: 'team-published';
      runId: string;
      version: number;
    }
  | {
      type: 'access-revoked';
      overlayId: string;
    }
  | {
      type: 'run-deleted';
      runId: string;
    }
  | {
      type: 'server-shutdown';
    };

type OverlayEventListener = (event: OverlayEvent) => void;

export class OverlayEventBus {
  private readonly listeners = new Map<string, Set<OverlayEventListener>>();

  subscribe(runId: string, listener: OverlayEventListener): () => void {
    let subscribers = this.listeners.get(runId);

    if (!subscribers) {
      subscribers = new Set();
      this.listeners.set(runId, subscribers);
    }

    subscribers.add(listener);

    let unsubscribed = false;

    return () => {
      if (unsubscribed) {
        return;
      }

      unsubscribed = true;

      const current = this.listeners.get(runId);

      if (!current) {
        return;
      }

      current.delete(listener);

      if (current.size === 0) {
        this.listeners.delete(runId);
      }
    };
  }

  getSubscriberCount(runId: string): number {
    return this.listeners.get(runId)?.size ?? 0;
  }

  getTotalSubscriberCount(): number {
    let total = 0;

    for (const subscribers of this.listeners.values()) {
      total += subscribers.size;
    }

    return total;
  }

  publishTeam(runId: string, version: number): void {
    this.emit(runId, {
      type: 'team-published',
      runId,
      version,
    });
  }

  revokeOverlay(runId: string, overlayId: string): void {
    this.emit(runId, {
      type: 'access-revoked',
      overlayId,
    });
  }

  deleteRun(runId: string): void {
    this.emit(runId, {
      type: 'run-deleted',
      runId,
    });

    this.listeners.delete(runId);
  }

  shutdown(): void {
    for (const runId of [...this.listeners.keys()]) {
      this.emit(runId, {
        type: 'server-shutdown',
      });
    }

    this.listeners.clear();
  }

  private emit(runId: string, event: OverlayEvent): void {
    const subscribers = this.listeners.get(runId);

    if (!subscribers) {
      return;
    }

    for (const listener of [...subscribers]) {
      try {
        listener(event);
      } catch {
        // Un suscriptor defectuoso no debe impedir
        // la notificación a los demás.
      }
    }
  }
}

export const overlayEventBus = new OverlayEventBus();
