
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

export type Handler = {
    handler_id: string;
    event_type: string;
    execution_type: "io" | "cpu";
    priority: number;
    max_retries: number;
    fn: (data: Record<string, unknown>) => Promise<void>;
};
