/**
 * src/cli/cli.ts
 * Commander entry point and command router
 */
import { program } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import ora from 'ora';
import Table from 'cli-table3';
import { input } from '@inquirer/prompts';
import { log } from 'console';
import type { User } from '../utils/types.js';
import { saveUserData, readUserData } from '../utils/filesystem.js';
import { initiateChat, replLoop } from './chat.js';
import { runDevMode } from './dev.js';





program
    .name("Cli-bot")
    .description("A Terminal-Based Developer Assistant")
    .version("1.0.0");

program
    .command("info")
    .description("Information about the user")
    .action(async () => {

        const asciiArt = figlet.textSync('Introduce yourself', {
            font: 'Standard',
            width: 60,
            horizontalLayout: 'fitted'
        });

        console.log(gradient.pastel.multiline(asciiArt));
        let userName: string = await input({ message: chalk.yellow("Enter your name: ") }),
            description: string = await input({ message: chalk.yellow("Enter a short description about yourself: ") });

        const user: User = {
            userName,
            description
        };
        saveUserData(user);
        process.stdout.write(chalk.green("User details sucessfully saved"));
    })



program
    .command("chat")
    .description("Start interactive chat mode")
    .action(async () => {
        console.log(chalk.bgBlue.white.bold(' CHAT MODE ') + chalk.blue(' Started!\n'));
        const asciiArt = figlet.textSync('Chat mode', { horizontalLayout: 'full' });
        console.log(gradient.pastel.multiline(asciiArt));
        await initiateChat();
        await replLoop();
    });

program
    .argument('[command...]')
    .action(async (commandParts) => {
        const [cmd = '', ...args] = commandParts ?? [];
        const devMode = await runDevMode(cmd, args);
    })

program.parse(process.argv);

