
import { program } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import ora from 'ora';
import Table from 'cli-table3';
import { input, select } from '@inquirer/prompts';
import { log } from 'console';
import type { SessionState, User, ChatMessage } from '../utils/types.js';
import { saveUserData, readUserData, createWorkspace, getWorkspaces, getSession, saveSession } from '../utils/filesystem.js';
import { createSession, firstmessage, initialiseWorkspace, replPrompt, previousSessionMessage, printMessage } from '../core/engine.js';
import { sendToApi } from '../core/api.js';
import { parseInput } from '../utils/parser.js'
import { Transform } from 'node:stream';
import * as readline from 'readline';

const parseAiResponse = (res: string) => {
    try {
        // Try to find content between ```json and ```
        const jsonMatch = res.match(/```json\s*([\s\S]*?)\s*```/);
        const contentToParse: any = jsonMatch ? jsonMatch[1] : res;

        // Find the first { and last } to handle cases with leading/trailing text
        const firstBrace = contentToParse.indexOf('{');
        const lastBrace = contentToParse.lastIndexOf('}');

        if (firstBrace === -1 || lastBrace === -1) {
            throw new Error("No JSON object found in response");
        }

        const jsonString = contentToParse.substring(firstBrace, lastBrace + 1);
        return JSON.parse(jsonString);
    } catch (error) {
        throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`);
    }
}


export const initiateChat = async (): Promise<void> => {
    const savedUser: User = await readUserData(),
        message = firstmessage(savedUser),
        prompt: string = JSON.stringify(message);


    const selected = await initialiseWorkspace();


    if (selected.type !== "new") {
        await previousSessionMessage(selected.name);
    }
    else {
        const spinner = ora('Cli-bot is thinking...').start();

        let res: string;
        try {
            res = await sendToApi(prompt);
            spinner.succeed("done");
            printMessage('assistant', res, savedUser.userName);
        } catch (error) {
            spinner.fail("Error processing greeting");
            console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : "Failed to connect to AI"}`));

            const choice = await select({
                message: chalk.yellow('What would you like to do?'),
                choices: [
                    { name: 'Retry workspace creation', value: 'retry' },
                    { name: 'Terminate selection and try again later', value: 'back' }
                ]
            });

            if (choice === 'retry') {
                return await initiateChat();
            } else {
                process.exit(); // Gracefully exit this function to return to workspace selection logic
            }
        }

        const entry: ChatMessage = {
            role: 'assistant',
            content: res,
            timestamp: new Date(Date.now())
        }

        const session: SessionState = createSession(savedUser);
        session.message.push(entry)
        let arr = []
        arr.push(session)
        await createWorkspace(selected.name)
        await saveSession(arr, selected.name)

    }



    // if (selected.type === "new") {

    // } else {
    //     const session = await getSession(selected.name);
    //     if (session && session.length > 0) {
    //         session[0].message.push(entry)
    //         await saveSession(session, selected.name)
    //     } else {
    //         // Fallback if session is empty or corrupted
    //         const newSession: SessionState = createSession(savedUser);
    //         newSession.message.push(entry);
    //         await saveSession([newSession], selected.name);
    //     }
    // }
    type extendedUser = User & {
        activeWorkspace: string
    }

    const updatedUser: extendedUser = {
        userName: savedUser.userName,
        description: savedUser.description,
        activeWorkspace: `${selected.name}`
    }

    await saveUserData(updatedUser)

}

const PASTE_NEWLINE = '\uE000';



export const replLoop = async () => {
    const savedUser: User = await readUserData();

    let inputBuffer = '';
    let isProcessing = false;
    let inputTimeout: NodeJS.Timeout | null = null;
    let lastChunkTime = 0;

    const BURST_GAP_MS = 20;    // gap below this = still inside a paste burst
    const FLUSH_DELAY_MS = 100; // flush only after this much silence

    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const prompt = () => {
        process.stdout.write(`${chalk.yellow('●')} ${chalk.bold(savedUser.userName)}: `);
    };

    // --- THE CORE LOGIC: PROCESSSING THE BUFFER ---
    const processBuffer = async () => {
        // Only process if there is content AND a newline was entered
        if (inputBuffer.length === 0 || (!inputBuffer.includes('\n') && !inputBuffer.includes('\r'))) {
            return;
        }

        const rawContent = inputBuffer;
        inputBuffer = ''; // Clear immediately so we don't process twice

        // 1. Get Session
        const session = await getSession(savedUser.activeWorkspace);
        const currentSession = session[0] || { message: [] };
        if (session.length === 0) session.push(currentSession);

        // 2. Prepare the entry
        // Use rawContent directly if your parseInput is too strict
        const userEntry: ChatMessage = {
            role: 'user',
            content: rawContent.trim(), 
            timestamp: new Date()
        };

        // 3. UI: Wipe the raw typed/pasted text to replace with formatted text
        const linesToErase = rawContent.split('\n').length;
        readline.moveCursor(process.stdout, 0, -(linesToErase - 1));
        readline.clearScreenDown(process.stdout);

        // 4. Print pretty version
        printMessage('user', userEntry.content, savedUser.userName, userEntry.timestamp);

        // 5. SAVE TO SESSION IMMEDIATELY (Before API call)
        currentSession.message.push(userEntry);
        await saveSession(session, savedUser.activeWorkspace);

        // 6. NOW call the API
        if (isProcessing) {
            // If already processing, the message is saved to history but we wait 
            // to call API for the next one to prevent overlapping spinners
            return; 
        }

        await callAiAssistant(currentSession, userEntry, savedUser);
    };

    const callAiAssistant = async (sessionData: any, userEntry: ChatMessage, user: User) => {
        isProcessing = true;
        const spinner = ora('Cli-bot is thinking...').start();

        try {
            const promptData = await replPrompt(sessionData, userEntry);
            const res = await sendToApi(JSON.stringify(promptData));
            const parsedRes = parseAiResponse(res);

            spinner.succeed(' ');

            const assistantEntry: ChatMessage = {
                role: 'assistant',
                content: parsedRes.reply,
                timestamp: new Date()
            };

            printMessage('assistant', assistantEntry.content, 'Assistant', assistantEntry.timestamp);

            // Fetch latest to avoid overwriting changes from other processes
            const updatedSession = await getSession(user.activeWorkspace);
            if (updatedSession[0]) {
                updatedSession[0].message.push(assistantEntry);
                await saveSession(updatedSession, user.activeWorkspace);
            }
        } catch (error: any) {
            spinner.fail('API Error');
            console.error(chalk.red(`\nError: ${error?.message || 'Unknown error'}`));
        } finally {
            isProcessing = false;
            prompt();
            // Check if user typed more while we were waiting
            if (inputBuffer.length > 0) processBuffer();
        }
    };

    process.stdin.on('data', (chunk: string) => {
        if (chunk === '\x03') { cleanup(); process.exit(0); }

        // Standard Backspace
        if (chunk === '\u007f') {
            if (inputBuffer.length > 0) {
                inputBuffer = inputBuffer.slice(0, -1);
                process.stdout.write('\b \b');
            }
            return;
        }

        inputBuffer += chunk;
        process.stdout.write(chunk); // Echo raw input so user sees what they paste

        // --- ADAPTIVE DEBOUNCE ---
        const now = Date.now();
        const gap = now - lastChunkTime;
        lastChunkTime = now;

        // gap < BURST_GAP_MS means we're mid-paste (chunks 5-15ms apart).
        // Either way we reset the timer and only flush after FLUSH_DELAY_MS
        // of silence, so a brief scheduler stutter mid-paste doesn't cause
        // a premature flush.
        if (inputTimeout) clearTimeout(inputTimeout);
        inputTimeout = setTimeout(() => {
            processBuffer();
        }, FLUSH_DELAY_MS);
    });

    const cleanup = () => {
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        process.stdin.pause();
    };

    prompt();
};