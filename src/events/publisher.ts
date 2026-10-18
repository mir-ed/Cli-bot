import { randomUUID } from "node:crypto";
import { eventBus } from "./emitter.js";
import { saveTransaction, saveToTable } from "../repository/repo.js";
import type { Event } from "../database/entities/index.js";


export enum EventEntityType {
    USER = "USER",
    DEVICE = "DEVICE",
    SESSION = "SESSION",
    WORKSPACE = "WORKSPACE",
    WORKSPACE_DEVICE = "WORKSPACE_DEVICE",

    EVENT = "EVENT",           // meta-events about the event system itself
    OUTBOX = "OUTBOX",
    DISPATCH = "DISPATCH",

    PROCESS = "PROCESS",
    PROCESS_OUTPUT = "PROCESS_OUTPUT",

    REQUEST = "REQUEST",
    AI_RESPONSE = "AI_RESPONSE",
    ACTION_PROPOSAL = "ACTION_PROPOSAL",

    INPUT = "INPUT",

    USER_CONFIG_PREFERENCES = "USER_CONFIG_PREFERENCES",
    USER_SECRETS_CREDENTIALS = "USER_SECRETS_CREDENTIALS",

    // For events that aren't about a specific entity
    NONE = "NONE",
}

export enum EventSource {
    // Runtime / pipeline
    I_O = "I_O",
    CLASSIFIER = "CLASSIFIER",


    // Feature modules
    AI_MODULES = "AI_MODULES",
    PROCESS_MANAGER = "PROCESS_MANAGER",
    USER_MANAGER = "USER_MANAGER",


    EVENT_SYSTEM = "EVENT_SYSTEM",        // internal events (dispatch failures, retries)

}

export enum EventType {
    INPUT_RECEIVED = "INPUT_RECEIVED",
}


export enum OutboxStatus {
    PENDING = "pending",
    DISPATCHED = "dispatched",
    FAILED = "failed",
}



export interface PublishInput {
    event_type: EventType | string;
    data: Record<string, unknown>;
    source_component: EventSource;
    entity_type?: EventEntityType;
    entity_id?: string;
    correlation_id?: string;
    actionable?: boolean;
}

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
            correlationId: savedEvent.correlation_id
        });

    } else {
        const savedEvent = await saveToTable("events", eventPayload);

        eventBus.emit("event:published", {
            event_id: savedEvent.event_id,
            event_type: input.event_type,
            correlationId: savedEvent.correlation_id
        });
    }
}