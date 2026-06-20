
/**
 * src/cli/display.ts
 * CLI-Bot splash — Error Diagnostic Engine
 * Brand color: #E8A838 (amber gold)
 */
import chalk from 'chalk';

const amber = chalk.hex('#E8A838');
const muted = chalk.hex('#6B6B6B');
const white = chalk.hex('#E8E8E8');

// ─── Logo and Title ────────────────────────────────────────────────────────────
const octopusLines = [
    '                   ████',
    '                ██████████',
    '               ██        ██',
    '              ██          ██',
    '       ████   █           ██   ████',
    '      ██  █   ██          ██  ██ ██',
    '      ██ ██    ███      ███   ██  █',
    '         █       █ █ ██ █      ██',
    '         ██     ██ ████ ███    ██',
    '      ███████████ ██  ██ ███████████',
    '     ██████████████    ██████  ██████',
    '      ███  █████          █████  ████',
    '           █    █        █   ██',
    '           ██████        ██████',
    '             ██            ██',
];

const titleLogo = [
    "       _ _       _           _   ",
    "   ___| (_)     | |__   ___ | |_ ",
    "  / __| | |_____| '_ \\ / _ \\| __|",
    " | (__| | |_____| |_) | (_) | |_ ",
    "  \\___|_|_|     |_.__/ \\___/ \\__|",
];

// ─── Display Page ────────────────────────────────────────────────────────────
export function cliBotDisplayPage(): void {
    console.log('');
    for (let i = 0; i < 15; i++) {
        let left = octopusLines[i]!.padEnd(42, ' ');
        let right = '';

        // Place the title right next to the octopus, vertically centered
        if (i >= 4 && i < 4 + 5) {
            right = amber.bold(titleLogo[i - 4]);
        } else if (i === 9) {
            right = muted('                             ');
        }
        // else if (i === 10) {
        //     right = muted(' AI powered developer tool');
        // } 
        else if (i === 10) {
            right = muted('                           v1.0.0');
        }

        console.log(amber(left) + right);
    }

    console.log('\n  ' + white.bold('Monitors your commands. Catches errors. AI explains fixes instantly.'));
    console.log('');

    console.log(muted('  Example:'));
    console.log(white('    $ ') + amber('cli-bot npm start'));
    console.log('');

    console.log(muted('  Commands:'));
    console.log(amber.bold('    cli-bot <command> ') + white('— Monitor any command, auto-explain errors in real-time'));
    console.log(amber.bold('    cli-bot chat      ') + white('— Open interactive AI chat for debugging & learning'));
    console.log(amber.bold('    cli-bot info      ') + white('— Set up your developer profile description, title, preferences)'));
    console.log('');

    console.log(white('  Get started: run ') + amber.bold('cli-bot info'));
    console.log('');
    console.log(muted('  Multi-layer error detection. Understands your stack. Suggests real fixes.'));
    console.log('');
}