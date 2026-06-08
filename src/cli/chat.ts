
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
import readline from 'readline';
import { parseInput } from '../utils/parser.js'

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

export const replLoop = async () => {
    const savedUser: User = await readUserData();
    // const session: SessionState = getSession();
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: `${chalk.yellow('●')} ${chalk.bold(savedUser.userName)}: `
    });

    rl.prompt();
    rl.on("line", async (input: string) => {

        const parsedData = parseInput(input);
        if (parsedData.type === "empty") {
            process.stdout.write(chalk.gray('Waiting for input.....\n'))
            rl.prompt();
        } else if (parsedData.type === "command") {
            if (parsedData.content === '/exit') {
                process.exit(0)
            }
            else {
                process.stdout.write(chalk.gray('This feature is still in production.....\n'))
            }

            rl.prompt();
        }
        else {
            const entry: ChatMessage = {
                role: "user",
                content: parsedData.content,
                timestamp: new Date(Date.now())
            }

            // Print the formatted user message to match the GUI
            printMessage('user', entry.content, savedUser.userName, entry.timestamp);

            const session = await getSession(savedUser.activeWorkspace)
            session[0].message.push(entry);
            await saveSession(session, savedUser.activeWorkspace)

            const spinner = ora('Cli-bot is thinking...').start();
            const prompt = await replPrompt(session[0], entry);

            try {
                const res = await sendToApi(JSON.stringify(prompt));
                const parsedRes = parseAiResponse(res);
                spinner.succeed(" ");

                printMessage('assistant', parsedRes.reply, savedUser.userName);

                const chatEntry: ChatMessage = {
                    role: 'assistant',
                    content: parsedRes.reply,
                    timestamp: new Date(Date.now())
                }

                const session2 = await getSession(savedUser.activeWorkspace);
                if (session2 && session2.length > 0) {
                    session2[0].message.push(chatEntry);
                    await saveSession(session2, savedUser.activeWorkspace);
                }
            } catch (error) {
                spinner.fail("Error processing response");
                console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : "An unexpected error occurred"}`));
            }
            rl.prompt();

        }
    })


}