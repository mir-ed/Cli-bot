import { eventBus } from "./emitter.js";
import { registry } from "./registry.js";
import { OutboxStatus } from "./event.types.js";
import { findInTable,saveTransaction, saveToTable, readTable, findManyInTable } from "../repository/repo.js";
import { enqueueJob } from "../repository/repo.jobs.js";



async function markOutboxFailed(outboxRow: any, error: string): Promise<void> {
    await saveToTable("outboxes", {
        ...outboxRow,
        status: "failed",
        error: error,
    });
}


async function dispatchToHandler(
    event: any,
    handler: any,
    eventData: any,
    writes: any[]
): Promise<void> {

    const existing = await findInTable("dispatches", {
        event_id: event.event_id,
        handler_id: handler.handler_id,
    });

    if (existing) {
        return; // Already dispatched in a previous run
    }

    const now = new Date().toISOString();

    
    try {
        await enqueueJob(handler.handler_id, {
            event_id: event.event_id,
            handler_id: handler.handler_id,
            event_data: eventData,
            correlation_id: event.correlation_id,
        });
    } catch (error) {
        console.error(`Failed to enqueue job for handler ${handler.handler_id}:`, error);
        return;
    }

    
    writes.push({
        table: "dispatches",
        data: {
            event_id: event.event_id,
            handler_id: handler.handler_id,
            status: "enqueued",
            job_id: null, // Filled later by executor
            created_at: now,
            enqueued_at: now,
        },
    });
}


export async function dispatchOne(outboxRow: any): Promise<void> {
    const event = await findInTable("events", { event_id: outboxRow.event_id });
    if (!event) {
        await markOutboxFailed(outboxRow, "Event not found");
        return;
    }

    const handlers = registry.getHandlers(event.event_type);
    if (handlers.length === 0) {
        await markOutboxFailed(outboxRow, "No handlers registered");
        return;
    }

    const eventData = JSON.parse(event.data);
    const now = new Date().toISOString();

    
    const writes: any[] = [];

    
    for (const handler of handlers) {
        await dispatchToHandler(event, handler, eventData, writes);
    }

 
    writes.push({
        table: "outboxes",
        data: {
            ...outboxRow,
            status: "dispatched",
            dispatched_at: now,
            error: null,
        },
    });

    try {
        await saveTransaction(writes);
    } catch (err) {
        console.error("Transaction failed in dispatchOne:", err);
        throw err; 
    }
}


export async function drainOutbox(): Promise<void> {
  
    const pendingRows = await findManyInTable("outboxes", { status: "pending" });

    if (pendingRows.length === 0) return;

    for (const row of pendingRows) {
        try {
            await dispatchOne(row);
        } catch (error) {
            console.error(`Failed to dispatch outbox row ${row.outbox_id}:`, error);
        }
    }
}


export function startDispatcher(): void {
    eventBus.on("event:published", async (payload) => {
        if (!payload.isActionable) return;
        await drainOutbox();
    });

  
    drainOutbox().catch((err) => {
        console.error("Startup outbox drain failed:", err);
    });
}