/**
 * src/core/engine.ts
 * Optional orchestration layer (prompt building, routing, context injection)
 */
import { timeStamp } from 'console';
import type { User, SessionState, ChatMessage, projectInfo, parsedError, errorContext } from '../utils/types.js';
import { randomUUID } from "crypto"
import { program } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import gradient, { retro } from 'gradient-string';
import boxen from 'boxen';
import ora from 'ora';
import Table from 'cli-table3';
import { input, select } from '@inquirer/prompts';
import { log } from 'console';

import {
    parseError,
    parseDevResponse, classifyStderr
} from "../utils/parser.js";

import {
    saveUserData, readUserData, createWorkspace,
    getWorkspaces, GetMessages, GetMainWorkspacePath,
    UpdateProject, GetProjectInfo, logDevError
} from '../utils/filesystem.js';

import { sendToApi } from '../core/api.js';
import readline from 'readline';
import { parseInput } from '../utils/parser.js';
import { asyncWrapProviders } from 'async_hooks';
import path from 'path';

export const buildSystemPrompt = (user: User): string => {
    return `
    You are an AI CLI assistant running inside a developer terminal.

    User details: 
    - Name: ${user.userName}
    - description: ${user.description}

    Behavioural rules: 
    - CRITICAL: Always return a valid JSON object.
    - DO NOT include markdown formatting like bold (**), italics (_), or bullet points (*) in your strings.
    - DO NOT use ellipsis (...) or other filler characters.
   
    - If unclear, ask clarifying questions within the "reply" field.
    - Keep responses suitable for raw CLI output.
    - Output format MUST be a single JSON object.


    Message Processing Rules:
    - If CURRENT_USER_MESSAGE is provided, treat it as the primary user input to respond to. Use the chatHistory solely as context.
    - If CURRENT_USER_MESSAGE is absent or empty, respond naturally based on the latest context in the chatHistory.
    `;

    // - Be concise, technical, and direct. Avoid conversational noise. // add this to rules later
}

export const createSession = (user: User): SessionState => {
    const systemPrompt = buildSystemPrompt(user);
    const title: string = randomUUID();

    return {
        title,
        systemPrompt,
        message: [],
        createdAt: new Date(Date.now())
    };
}


export const firstmessage = (user: User) => {
    const message: ChatMessage = {
        role: "system",
        content: `generate a short, unique welcome message for an AI CLI assistant called Cli-bot session based on user details.
                  User details: 
                  - Name : ${user.userName}
                  - description : ${user.description}
                  
                  Rules: 
                  - Keep it under 3-5 lines.
                  - Do not be repetitive or generic.
                  - each message must feel slightly different in tone and phrasing.
                  - Avoid emoji overload.
                  - Dont explain anything, only output the welcome message

            


                  output only welcome message.
        
        `,
        timestamp: new Date(Date.now())
    }


    return {
        message
    }
}

export const initialiseWorkspace = async () => {
    let workspaces: string[] = [];
    try {
        workspaces = await getWorkspaces();
    } catch (error) {
        // If the storage/workspaces directory doesn't exist yet, we default to empty
    }

    const user = await readUserData();

    const choices = workspaces.map(ws => {
        const isCurrent = ws === user.activeWorkspace;
        const displayName = isCurrent ? `${ws} ${chalk.green('(Active)')}` : ws;
        return { name: displayName, value: ws };
    });
    choices.push({ name: "NEW WORKSPACE", value: "NEW_WORKSPACE" });

    const selected = await select({
        message: chalk.yellow('Choose an existing workspace or create a new one for this project:'),
        choices: choices
    });

    if (selected === "NEW_WORKSPACE") {
        let cleanName = "";
        while (true) {
            const newWorkspaceName = await input({ message: chalk.yellow('Enter the new workspace name: ') });
            cleanName = newWorkspaceName
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9-_ ]/g, '')
                .replace(/\s+/g, '-');

            if (!cleanName) {
                console.log(chalk.red("\nError: Workspace name cannot be empty. Please enter a valid name.\n"));
                continue;
            }

            if (workspaces.includes(cleanName)) {
                console.log(chalk.red(`\nError: Workspace "${cleanName}" already exists. Please choose a unique name.\n`));
                continue;
            }
            break;
        }
        return { type: "new", name: cleanName };
    }

    return { type: "existing", name: selected };
}


export const replPrompt = async (session: SessionState, data: ChatMessage) => {
    let currentSystemPrompt = session.systemPrompt;

    // const userMessages = session.message.filter(m => m.role === 'user');

    // // If this is the AI's first response to the user's first message
    // if (userMessages.length === 1) {
    //     currentSystemPrompt +=
    //         `

    // =========================================
    // CRITICAL INSTRUCTION FOR THIS TURN ONLY:
    // =========================================
    // Because this is the first message, you must generate a short 3-5 word title for the session.
    // - The title MUST be based strictly on the user's first message.
    // - Do NOT use the user's name, description, or your own response to influence the title.

    // Example Expected Output FOLLOW THIS STRICTLY:
    // {
    //   "title": "learning java for frontend",
    //   "reply": "Sure! Here is a roadmap to get you started with Java..."
    // }
    // DO NOT include any commentary, notes, or markdown blocks outside the JSON.
    // DO NOT use characters like * or _ for formatting inside the strings.
    // `

    // }


    return {
        _systemContext: currentSystemPrompt,
        chatHistory: session.message,
        CURRENT_USER_MESSAGE: data.content
    }
}

export const printMessage = (role: string, content: string, userName: string, timestamp?: Date | string) => {
    const isUser = role === 'user' || role === 'system'; // System messages often handled like AI or special, but let's stick to user/bot
    const color = isUser && role !== 'system' ? chalk.yellow : chalk.cyan;
    const name = isUser && role !== 'system' ? userName : 'cli-bot';
    const time = timestamp ? chalk.dim(` • ${new Date(timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`) : '';

    // Print Header with plain marker
    console.log(`\n${color('●')} ${color.bold(name)}${time}`);

    // Print content with a vertical bar on the left
    const lines = content.split('\n');
    lines.forEach(line => {
        console.log(`${color('┃')}  ${line}`);
    });

    // Add a small footer gap
    console.log(`${color('┃')}`);
}

export const previousSessionMessage = async (workspace: string | undefined) => {
    const messages: ChatMessage[] = await GetMessages(workspace); // i changed this incase of error the root is the the getmessage function
    const user = await readUserData();

    if (!messages || messages.length === 0) return;

    messages.forEach((msg) => {
        if (msg.role === 'system') return; // Skip internal system prompts
        printMessage(msg.role, msg.content, user.userName, msg.timestamp);
    });

    console.log(chalk.dim('\n' + '—'.repeat(30) + '\n'));
}


export const LinkWorksSpace = async () => {
    let selected;
    let projectInfo: projectInfo | null = null;
    let isAlreadyLinked = false;
    const currentProjectPath = process.cwd();

    while (true) {
        selected = await initialiseWorkspace();

        if (selected.type === "new") {
            break;
        }

        // Check if project.json exists in the existing workspace
        projectInfo = await GetProjectInfo(selected.name);
        if (!projectInfo) {
            // No project.json exists yet, so we can proceed
            break;
        }

        // project.json exists. Compare project paths.
        const normalCurrent = path.resolve(currentProjectPath).toLowerCase();
        const normalStored = path.resolve(projectInfo.projectPath).toLowerCase();

        if (normalCurrent === normalStored) {
            console.log(chalk.blue(`\nMessage: Project already linked to this workspace.`));
            isAlreadyLinked = true;
            break;
        } else {
            console.log(chalk.red(`\nError: Workspace "${selected.name}" is already linked to another project: ${projectInfo.projectPath}`));
            console.log(chalk.yellow(`Please choose a different workspace.\n`));
            // Loop repeats
        }
    }

    const workspacePath = await GetMainWorkspacePath(selected.name);
    if (selected.type === "new") {
        await createWorkspace(selected.name);
    }

    if (!isAlreadyLinked) {
        const description: string = await input({ message: chalk.yellow("Enter a short description about the project(Be as detailed as possible): ") });
        const newProjectInfo: projectInfo = {
            workSpaceName: selected.name,
            projectPath: currentProjectPath,
            projectDescription: description.trim(),
            createdAt: new Date(Date.now())
        };
        await UpdateProject(workspacePath, newProjectInfo);
    }

    const savedUser: User = await readUserData();
    type extendedUser = User & {
        activeWorkspace: string
    }

    const updatedUser: extendedUser = {
        userName: savedUser.userName,
        description: savedUser.description,
        activeWorkspace: `${selected.name}`
    }

    await saveUserData(updatedUser);
    console.log(chalk.green(`\nMessage: Workspace linked sucessfully`));
}




export const handleDevModeExecution = async (stderrData: string, cmd: string, arg: string[]) => {
    const spinner = ora('dev-mode parsing error...').start();
    const err: parsedError = await parseError(stderrData);

    const signals = classifyStderr(stderrData);
    console.log(signals);

    const context = await buildContext(cmd, arg, err);
    const errorPrompt = await buildErrorPrompt(context);
    try {
        const response = await sendToApi(errorPrompt)
        spinner.succeed("Error explained successfully");

        const parsedRes = parseDevResponse(response);

        // Log error to logs folder
        if (context.workspaceName) {
            await logDevError(context.workspaceName, {
                command: cmd + " " + arg.join(" "),
                rawError: stderrData,
                parsedResponse: parsedRes,
                timestamp: new Date()
            });
        }

        // Print the raw error back to stderr
        process.stderr.write(chalk.red(stderrData) + "\n");

        // Format UI/UX of parsed AI explanation
        let confidenceColor = chalk.gray;
        if (parsedRes.confidence.toLowerCase().includes('high')) {
            confidenceColor = chalk.green.bold;
        } else if (parsedRes.confidence.toLowerCase().includes('medium')) {
            confidenceColor = chalk.yellow.bold;
        } else if (parsedRes.confidence.toLowerCase().includes('low')) {
            confidenceColor = chalk.red.bold;
        }

        const content = [
            `${chalk.cyan.bold('● EXPLANATION')}`,
            `${parsedRes.explanation}`,
            ``,
            `${chalk.red.bold('● ROOT CAUSE')}`,
            `${parsedRes.rootCause}`,
            ``,
            `${chalk.green.bold('● SUGGESTED FIX')}`,
            `${parsedRes.fix}`,
            ``,
            `${chalk.yellow.bold('● PREVENTION')}`,
            `${parsedRes.prevention}`,
            ``,
            `${chalk.magenta.bold('● CONFIDENCE')}: ${confidenceColor(parsedRes.confidence)} ${parsedRes.confidenceReason ? chalk.dim(`(${parsedRes.confidenceReason})`) : ''}`
        ].join('\n');

        const uiBox = boxen(content, {
            title: chalk.cyan.bold(' CLI-BOT DEV-MODE '),
            titleAlignment: 'left',
            padding: 1,
            margin: { top: 1, bottom: 1 },
            borderStyle: 'round',
            borderColor: 'cyan',
            backgroundColor: '#1a1a1a'
        });

        console.log(uiBox);
    } catch (error) {
        process.stderr.write(chalk.red(stderrData));
        spinner.fail("Error processing response");
        console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : "An unexpected error occurred"}`));

        if (context.workspaceName) {
            await logDevError(context.workspaceName, {
                command: cmd + " " + arg.join(" "),
                rawError: stderrData,
                parsedResponse: { error: error instanceof Error ? error.message : String(error) },
                timestamp: new Date()
            });
        }
    }
}

export const buildContext = async (cmd: string, arg: string[], err: parsedError) => {
    const user = await readUserData()
    const projectInfo: projectInfo | null = await GetProjectInfo(user.activeWorkspace)


    const context: errorContext = {
        "commands": cmd + " " + arg,
        "eventType": err.eventType,
        "errorOutput": err.content,
        "projectDescriptionn": projectInfo?.projectDescription,
        "projectPath": projectInfo?.projectPath,
        "workspaceName": user.activeWorkspace,
        "timestamp": new Date(Date.now())

    }

    return context
}

export const buildErrorPrompt = async (context: errorContext) => {
    return `
    You are a senior software debugging assistant inside a developer tool called cli-bot Dev-Mode.

    Your job is to analyze runtime errors from any programming language and explain them clearly and practically.

    This is a structured error context that you should use:

    ---
    CONTEXT: 
    ProjectName: ${context.workspaceName}
    ProjectDescription: ${context.projectDescriptionn}
    ProjectPath: ${context.projectPath}

    Command: ${context.commands}
    Event-type: ${context.eventType}
    Error timestamp: ${context.timestamp}
    Error output: ${context.errorOutput}

    ---

    TASK: 
    1. Explain what went wrong in simple terms. 
    2. Identify the root cause.
    3. Provide practical fix (not theory).
    4. If possible, suggest how to prevent it.
    5. Be precise and avoid guessing.

    ---

    OUTPUT FORMAT: 
    You MUST respond with a single, valid JSON object with the following fields, each fields should have at least 20-25 words:
    {
      "explanation": "A clear explanation of what went wrong in simple terms.",
      "rootCause": "The identified root cause of the error.",
      "fix": "A practical, actionable fix or solution.",
      "prevention": "How to prevent this error in the future, if applicable.",
      "confidence": "Confidence level (e.g., High, Medium, Low).",
      "confidenceReason": "Brief explanation of why you chose this confidence level."
    }

    ---

    Behavioural rules: 
    - CRITICAL: Always return a valid JSON object.
    - DO NOT include markdown formatting like bold (**), italics (_), or bullet points (*) in your strings.
    - DO NOT use ellipsis (...) or other filler characters.
    - Be concise, technical, and direct. Avoid conversational noise.
    - Keep responses suitable for raw CLI output.
    - Do NOT ask questions.
    - Do NOT assume missing context.
    - If uncertain, reduce confidence.
    - for each session i need at least 30+ words.
    - Focus only on the error output provided.
    `
}