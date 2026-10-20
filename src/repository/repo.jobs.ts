import { getQueue } from "./initDb.js";

// export async function enqueueJob(handlerId: string, payload: any) {
//     const queue = getQueue();
//     // Assuming LiteQ has a way to enqueue by task name
//     return queue.enqueue(handlerId, payload);
// }

const enqueuers = new Map<string, Function>();

export function registerLiteQHandler(handlerId: string, fn: (job: any) => Promise<void>) {
    const queue = getQueue();
    const enqueuer = queue.register(handlerId, fn);
    enqueuers.set(handlerId, enqueuer);
}

export async function enqueueJob(handlerId: string, payload: any) {
    const enqueuer = enqueuers.get(handlerId);
    if (!enqueuer) {
        throw new Error(`Handler ${handlerId} not registered with LiteQ`);
    }

    return await enqueuer(payload);
}