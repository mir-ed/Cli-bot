/**
 * src/cli/dev.ts
 * Developer mode (error input, explanation, debugging assistant)
 */

import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { ChildProcess, spawn } from "child_process"
import {
    //parseError,
    parseDevResponse, classifyStderr, isEmptyCommand, confirmCmd, getRuntimeLanguage
} from "../utils/parser.js";
import {
    // buildContext,
    buildErrorPrompt, LinkWorksSpace, handleDevModeExecution
} from "../core/engine.js";
import type { parsedError, softSignal } from "../utils/types.js";
import { sendToApi } from "../core/api.js";
import { logDevError } from "../utils/filesystem.js";
import { clearTimeout } from 'timers';
import { processError } from 'vitest/internal/browser';
import { input, select } from '@inquirer/prompts';
import { cliBotDisplayPage } from './displayPage.js';
import { log } from 'console';

export const runDevMode = async (cmd: string, arg: string[]): Promise<ChildProcess | undefined> => {


    let command = cmd,
        args = arg.join(" ");


    const isEmpty = isEmptyCommand(`${command + args}`)

    if (isEmpty) {
        cliBotDisplayPage()
        return;
    }

    const result = confirmCmd(cmd)
    if (result.status === "suggestion" && result.suggestion) {
        const choice = await select({
            message: `Command not found. Did you mean ${result.suggestion}?`,
            choices: [
                {
                    name: `Yes, run ${result.suggestion}`,
                    value: result.suggestion
                },
                {
                    name: `No, keep my command (${cmd})`,
                    value: cmd
                }
            ]
        });
        cmd = choice;
        command = choice;
    } else if (result.status === "invalid") {
        const choice = await select({
            message: `Command "${cmd}" not found. What would you like to do?`,
            choices: [
                {
                    name: `Keep my command (${cmd})`,
                    value: "keep"
                },
                {
                    name: `Rewrite command`,
                    value: "rewrite"
                }
            ]
        });

        if (choice === "rewrite") {
            const newCmd = await input({ message: "Enter your command:" });
            cmd = newCmd;
            command = newCmd;
        }
    }
    const runtimeLanguage = getRuntimeLanguage(cmd)

    await LinkWorksSpace()
    let stderrBuffer: string[] = [];
    let signalBuffer: softSignal[] = [];
    let stderrTimer: NodeJS.Timeout | null = null;
    const debounce = 300;

    const child = spawn(cmd, arg, {
        stdio: ['inherit', 'inherit', 'pipe'],
        shell: true
    });
    // child.stdout.on('data', (data) => {
    //     process.stdout.write(data);
    // });

    child.stderr.on('data', async (data) => {

        stderrBuffer.push(data.toString())

        if (stderrTimer) {
            clearTimeout(stderrTimer)
        }
        stderrTimer = setTimeout(async () => {
            await handleDevModeExecution(stderrBuffer.join(""), cmd, arg, runtimeLanguage.runtime, runtimeLanguage.language)
            stderrBuffer = [];
            stderrTimer = null;
        }, debounce)


    });

    //process.stderr.write(transformed + "\n");


    child.on('exit', (code) => {
        console.log(`[PROCESS EXITED] code=${code}`);
    });


    child.on('error', (err) => {
        console.error('FAILED TO START', err.message);
    });

    return child
}



// function formatError(msg: string) {
//     return `[Transformed error] ${msg.trim()}`
// }

