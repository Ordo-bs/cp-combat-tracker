import type { CombatEvent, EventHandler, EventPayload } from "./EventTypes";

export class EventDispatcher {
  private readonly subscribers = new Map<CombatEvent, Set<EventHandler>>();

  subscribe(event: CombatEvent, handler: EventHandler): () => void {
    let handlers = this.subscribers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.subscribers.set(event, handlers);
    }
    handlers.add(handler);
    return () => {
      handlers?.delete(handler);
    };
  }

  publish(event: CombatEvent, payload: EventPayload = {}): void {
    const handlers = this.subscribers.get(event);
    if (!handlers) {
      return;
    }
    for (const handler of handlers) {
      handler(payload);
    }
  }

  unsubscribe(event: CombatEvent, handler: EventHandler): void {
    this.subscribers.get(event)?.delete(handler);
  }

  clear(): void {
    this.subscribers.clear();
  }
}
