
export class DuplicateHandlerIdError extends Error {
    code = "DUPLICATE_HANDLER_ID";
    constructor(id: string) {
        super(`Handler id already registered: ${id}`);
        this.name = "DuplicateHandlerIdError";
    }
}
export class InvalidHandlerError extends Error {
    code = "INVALID_HANDLER";
    constructor(msg: string) {
        super(msg);
        this.name = "InvalidHandlerError";
    }
}
export class UnknownHandlerError extends Error {
    code = "UNKNOWN_HANDLER";
    constructor(id: string) {
        super(`Unknown handler: ${id}`);
        this.name = "UnknownHandlerError";
    }
}
export class UnknownEventTypeError extends Error {
    code = "UNKNOWN_EVENT_TYPE";
    constructor(type: string) {
        super(`No handlers for event type: ${type}`);
        this.name = "UnknownEventTypeError";
    }
}