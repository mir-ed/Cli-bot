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
    parseDevResponse, classifyStderr,
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


export const runDevMode = async (cmd: string, arg: string[]): Promise<ChildProcess> => {

    await LinkWorksSpace()
    let stderrBuffer: string[] = [];
    let signalBuffer: softSignal[] = [];
    let stderrTimer: NodeJS.Timeout | null = null;
    const debounce = 100;

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
            await handleDevModeExecution(stderrBuffer.join(""), cmd, arg)
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

