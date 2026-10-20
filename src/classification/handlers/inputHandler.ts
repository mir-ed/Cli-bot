// export async function echoInput(data: Record<string, unknown>): Promise<void> {
//     //  const { event_data, correlation_id, event_id } = data.data;
//     const message = data.data.event_data.message;
//     if (typeof message !== "string" || message.length === 0) {
//         throw new Error("echoInput: missing or invalid 'message' in payload");
//     }
//     console.log(`\n[cli-bot] You said: ${message}\n`);
// }


// handlers/echoInput.ts
// handlers/echoInput.ts


import { printAsync } from "../../utils/print.js";
type EchoJob = {
    id: string;
    taskType: string;
    attempts: number;
    maxRetries: number;
    data: {
        event_id: string;
        handler_id: string;
        correlation_id: string;
        event_data: { message?: unknown };
    };
};

export async function echoInput(job: Record<string, unknown>): Promise<void> {
    const { id, taskType, attempts, data } = job as unknown as EchoJob;

    console.timeEnd(`job-${data.correlation_id}`);

    const message = data?.event_data?.message;

    if (typeof message !== "string" || message === "") {
        throw new Error("echoInput: missing or invalid 'message' in payload");
    }

    printAsync(`you said: ${message}`);
}