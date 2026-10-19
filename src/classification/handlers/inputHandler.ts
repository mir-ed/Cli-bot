export async function echoInput(data: Record<string, unknown>): Promise<void> {
    const message = data.message;
    if (typeof message !== "string" || message.length === 0) {
        throw new Error("echoInput: missing or invalid 'message' in payload");
    }

    console.log(`\n[cli-bot] You said: ${message}\n`);
}