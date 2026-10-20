import { randomUUID } from "node:crypto";
import { eventBus } from "./emitter.js";
import { saveTransaction, saveToTable } from "../repository/repo.js";
import type { Event } from "../database/entities/index.js";
import { EventType, EventEntityType, EventSource, OutboxStatus } from "./event.types.js";
import type { PublishInput } from "./event.types.js";





export async function publish(input: PublishInput): Promise<void> {
    if (!input.event_type || typeof input.event_type !== "string") {
        throw new Error("ValidationError: event_type must be a non-empty string");
    }
    if (!input.data || typeof input.data !== "object" || Array.isArray(input.data)) {
        throw new Error("ValidationError: data must be a plain object");
    }
    if (!input.source_component) {
        throw new Error("ValidationError: source_component is required");
    }

    const isActionable = input.actionable ?? true;
    const correlationId = input.correlation_id ?? crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const eventPayload = {
        correlation_id: correlationId,
        sequence_number: 0,
        event_type: input.event_type,
        entity_type: input.entity_type ?? EventEntityType.NONE,
        entity_id: input.entity_id ?? "",
        data: JSON.stringify(input.data),
        source_component: input.source_component,
        created_at: createdAt,
    };

    if (isActionable) {
        const [savedEvent] = await saveTransaction([
            { table: "events", data: eventPayload },
            {
                table: "outboxes",
                data: ([event]: [Event]) => ({
                    event_id: event.event_id,
                    status: OutboxStatus.PENDING,
                    created_at: createdAt,
                })
            },
        ]);

        eventBus.emit("event:published", {
            event_id: savedEvent.event_id,
            event_type: input.event_type,
            correlationId: savedEvent.correlation_id,
            isActionable : true
        });

    } else {
        const savedEvent = await saveToTable("events", eventPayload);

        eventBus.emit("event:published", {
            event_id: savedEvent.event_id,
            event_type: input.event_type,
            correlationId: savedEvent.correlation_id,
            isActionable: false
        });
    }
}