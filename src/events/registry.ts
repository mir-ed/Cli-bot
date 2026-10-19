import {
    DuplicateHandlerIdError,
    InvalidHandlerError,
    UnknownHandlerError,
    UnknownEventTypeError,
} from "./registry.error.js";
import type { Handler } from "./event.types.js";


export class EventRegistry {
    private byEventType = new Map<string, Handler[]>();
    private byId = new Map<string, Handler>(); // fast global id lookup

    register(h: Handler): void {
        this.validate(h);

        if (this.byId.has(h.handler_id)) {
            throw new DuplicateHandlerIdError(h.handler_id);
        }

        if (!this.byEventType.has(h.event_type)) {
            this.byEventType.set(h.event_type, []);
        }

        this.byEventType.get(h.event_type)!.push(h);
        this.byId.set(h.handler_id, h);
    }

    getHandlers(eventType: string): Handler[] {
        const handlers = this.byEventType.get(eventType);
        if (!handlers) return [];
        return handlers.slice().sort((a, b) => b.priority - a.priority);
    }


    deregisterHandler(id: string): Handler {
        const h = this.byId.get(id);
        if (!h) throw new UnknownHandlerError(id);

        const list = this.byEventType.get(h.event_type)!;
        const remaining = list.filter((x) => x.handler_id !== id);
        if (remaining.length === 0) this.byEventType.delete(h.event_type);
        else this.byEventType.set(h.event_type, remaining);

        this.byId.delete(id);
        return h;
    }


    deregisterEvent(eventType: string, policy: "force" | "safe" = "force"): number {
        const list = this.byEventType.get(eventType);
        if (!list) throw new UnknownEventTypeError(eventType);

        if (policy === "safe") {
            // TODO: Implement "safe" policy.
            // Before removing handlers, query the outbox table for any rows where 
            // status === 'pending' AND the event's event_type matches this eventType.
            // If any pending work exists, throw an error or block until it is resolved 
            // so we don't orphan in-flight events.
            throw new Error("Policy 'safe' is not implemented yet");
        }

        for (const h of list) this.byId.delete(h.handler_id);
        this.byEventType.delete(eventType);
        return list.length;
    }
    
    hasHandler(id: string): boolean {
        return this.byId.has(id);
    }

    getAllEventTypes(): string[] {
        return [...this.byEventType.keys()];
    }

    clear(): void {
        this.byEventType.clear();
        this.byId.clear();
    }

    private validate(h: Handler): void {
        const nonEmpty = (s: unknown) => typeof s === "string" && s.length > 0;
        if (!nonEmpty(h?.handler_id)) throw new InvalidHandlerError("handler_id must be a non-empty string");
        if (!nonEmpty(h.event_type)) throw new InvalidHandlerError("event_type must be a non-empty string");
        if (h.execution_type !== "io" && h.execution_type !== "cpu")
            throw new InvalidHandlerError('execution_type must be "io" or "cpu"');
        if (typeof h.priority !== "number") throw new InvalidHandlerError("priority must be a number");
        if (!Number.isInteger(h.max_retries) || h.max_retries < 0)
            throw new InvalidHandlerError("max_retries must be a non-negative integer");
        if (typeof h.fn !== "function") throw new InvalidHandlerError("fn must be a function");
    }
}

// the one shared instance
export const registry = new EventRegistry();


