import { log } from 'console';
import type { User, SessionState, projectInfo } from './types.js';
import { writeFile, readFile, mkdir, readdir, appendFile } from 'fs/promises'
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const storagePathResolved = path.join(projectRoot, "storage");
const UserDataFilePath = path.join(storagePathResolved, "user.json");
const workspaceRoot = path.join(storagePathResolved, "workspaces");


export const saveUserData = async (user: User) => {
    try {
        await writeFile(UserDataFilePath, JSON.stringify(user));

    } catch (error) {
        console.error("Error saving user data:", error);
    }

}

export const readUserData = async (): Promise<User> => {
    const user: string = await readFile(UserDataFilePath, "utf-8")
    const ParsedUser = JSON.parse(user) as User
    return ParsedUser;
}


export const createWorkspace = async (name: string) => {
    const workspacePath = path.join(workspaceRoot, `${name}`)
    await mkdir(workspacePath, { recursive: true })

    // initialising internal files
    const sessionPath = path.join(workspacePath, "session.json"),
        memoryPath = path.join(workspacePath, "memory.json"),
        logPath = path.join(workspacePath, "log.json"),
        metaPath = path.join(workspacePath, "meta.json");



    await writeFile(sessionPath, JSON.stringify([]));
    await writeFile(memoryPath, JSON.stringify([]));
    await writeFile(logPath, JSON.stringify([]));
    await writeFile(metaPath, JSON.stringify([]));

    // let arr = await readFile(sessionPath, "utf-8"),
    //     parsedarr = JSON.parse(arr)
    // parsedarr.push(session);
    // await writeFile(sessionPath, JSON.stringify(parsedarr))



}



export const getWorkspaces = async () => {
    const items = await readdir(workspaceRoot, { withFileTypes: true })

    return items.filter(item => item.isDirectory()).map(item => item.name)
}

export const getSession = async (workspace: string | undefined) => {
    const workspacePath = path.join(workspaceRoot, `${workspace}`),
        sessionPath = path.join(workspacePath, "session.json");

    const session = await readFile(sessionPath, "utf-8")
    return JSON.parse(session)

}

export const saveSession = async (data: SessionState[], workspace: string | undefined) => {
    const workspacePath = path.join(workspaceRoot, `${workspace}`),
        sessionPath = path.join(workspacePath, "session.json");

    await writeFile(sessionPath, JSON.stringify(data, null, 2), {encoding: "utf8"})
}


export const GetMessages = async (workspace: string | undefined) => {
    const workspacePath = path.join(workspaceRoot, `${workspace}`),
        sessionPath = path.join(workspacePath, "session.json");

    const messages = await readFile(sessionPath, 'utf-8');

    let parsedMessages;

    try {
        parsedMessages = JSON.parse(messages);
    } catch (error) {
        console.error(
            chalk.red(
                'Session data is corrupted and could not be read. Starting a fresh session.'
            )
        );

        return [];
    }

    if (!Array.isArray(parsedMessages) || !parsedMessages[0]?.message) {
        console.error(
            chalk.red(
                'Session data is corrupted and could not be read. Starting a fresh session.'
            )
        );

        return [];
    }

    return parsedMessages[0].message;
};

export const GetMainWorkspacePath = async (workspace: string | undefined) => {
    // const items = await getWorkspaces()
    // const value = items.find(ws => ws === workspace)
    const worksapcePath = path.join(workspaceRoot, `${workspace}`)
    return worksapcePath
}

export const UpdateProject = async (Filepath: string, projectInfo: projectInfo) => {
    const projectPath = path.join(Filepath, "project.json")
    await writeFile(projectPath, JSON.stringify(projectInfo))
}

export const GetProjectInfo = async (workspace: string | undefined): Promise<projectInfo | null> => {
    const workspacePath = path.join(workspaceRoot, `${workspace}`);
    const projectFilePath = path.join(workspacePath, "project.json");
    try {
        const content = await readFile(projectFilePath, "utf-8");
        return JSON.parse(content) as projectInfo;
    } catch {
        return null;
    }
}

export const logDevError = async (workspaceName: string, data: {
    command: string;
    rawError: string;
    parsedResponse?: any;
    timestamp: Date;
}) => {
    try {
        const logsDir = path.join(storagePathResolved, "logs");
        // await mkdir(logsDir, { recursive: true });

        const logFilePath = path.join(logsDir, `${workspaceName}.log`);
        const separator = "—".repeat(50);
        const logEntry = `[${data.timestamp.toISOString()}] Command: ${data.command}
Raw Error:
${data.rawError}

AI Response:
${JSON.stringify(data.parsedResponse, null, 2)}
${separator}
\n`;
        await appendFile(logFilePath, logEntry, "utf-8");
    } catch (error) {
        console.error("Error writing to dev log file:", error);
    }
}



