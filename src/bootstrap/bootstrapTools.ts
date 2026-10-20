import path from "path";
import fs from "fs";
import chalk from "chalk";
import gradient from "gradient-string";
import os, { userInfo } from "node:os";
import { input } from "@inquirer/prompts";
import { saveToTable, readTable, findInTable, saveTransaction } from "../repository/repo.js";
import { SessionStatus } from "../database/enums/enum.js";
import { runDevMode } from "../cli/dev.js";
import { randomUUID } from "node:crypto";
import { setRl } from "../utils/print.js";

import readline from "node:readline";
import type { Session } from "../database/entities/Session.js";

import { getCliBotDir } from "../utils/filesystem.js";
import { initDb, initQueue, stopQueue } from "../repository/initDb.js";
import { OSname, SynchronizationState } from "../database/enums/enum.js";
//import type { User } from "../utils/types.js";
import { Interface } from "node:readline";
import type { User, WorkspaceDevice, Input } from "../database/entities/index.js";
import { getInstallationId } from "../utils/installationId.js";
import { publish } from "../events/publisher.js";
import { EventType, EventEntityType, EventSource } from "../events/event.types.js";
import { registerHandler } from "./registerHandler.js";
import { registry } from "../events/registry.js";
import { startDispatcher } from "../events/dispatcher.js";


interface DeviceInfo {
  installation_id: string;
  device_name: string;
  device_label: string;
  os_name: OSname;
  os_version: string;
  os_build: string;
  architecture: string;
  device_model: string;
  device_manufacturer: string;
  hostname: string;
  app_version: string;
  synchronization_state: SynchronizationState;
  updated_at: string;
  last_seen: string;
  created_at: string;
}

function getDeviceInfo(appVersion: string): DeviceInfo {
  const now = new Date().toISOString();
  const platform = os.platform();
  const hostname = os.hostname();
  const arch = os.arch();

  return {


    installation_id: getInstallationId(),
    device_name: hostname,
    device_label: hostname,
    os_name: mapPlatformToOSname(platform),
    os_version: os.release(),
    os_build: getOsBuild(platform),
    architecture: arch,
    device_model: getDeviceModel(platform, arch),
    device_manufacturer: getManufacturer(platform),
    hostname,
    app_version: appVersion,
    synchronization_state: SynchronizationState.PENDING,
    updated_at: now,
    last_seen: now,
    created_at: now,
  };
}

function mapPlatformToOSname(platform: NodeJS.Platform): OSname {
  switch (platform) {
    case "linux": return OSname.LINUX;
    case "darwin": return OSname.MACOS;
    case "win32": return OSname.WINDOWS;
    default: return OSname.UNKNOWN;
  }
}

function getOsBuild(platform: NodeJS.Platform): string {
  if (platform === "linux") {
    try {
      const rel = fs.readFileSync("/etc/os-release", "utf8");
      const m = rel.match(/^VERSION_ID="?([^"\n]+)"?/m);
      if (m && m[1]) return m[1];       // ← fixed: guard m[1]
    } catch { /* ignore */ }
  }
  return os.release();
}

function getDeviceModel(platform: NodeJS.Platform, arch: string): string {
  if (platform === "darwin") return `Mac (${arch})`;
  if (platform === "linux") return `Linux (${arch})`;
  if (platform === "win32") return `PC (${arch})`;
  return `Unknown (${arch})`;
}

function getManufacturer(platform: NodeJS.Platform): string {
  if (platform === "darwin") return "Apple";
  if (platform === "win32") return "Microsoft";
  if (platform === "linux") return "Linux";
  return "Unknown";
}




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



interface UserInfo {
  username: string;
  user_description: string;
}

async function getUserInfo(): Promise<UserInfo> {
  printLogo();
  printIntro();

  const username = await input({
    message: chalk.yellow("Enter your name: "),
  });

  const user_description = await input({
    message: chalk.yellow("Tell cli-bot who you are and what you do.\n(Optional. Helps cli-bot give better answers.)\n>"),
  });

  return { username, user_description };
}

// function printLogo(): void {
//   console.log("");
//   for (const line of octopusLines) {
//     console.log(chalk.hex("#FF8C00")(line));   // orange
//   }
//   console.log("");
//   console.log(
//     chalk.hex("#FF8C00").bold("              CLI-BOT") +
//       chalk.gray("   ·   terminal developer assistant"),
//   );
//   console.log("");
// }

// function printIntro(): void {
//   const orange = chalk.hex("#FF8C00");
//   const rule = chalk.gray("─".repeat(58));
//   const pillar = (name: string, text: string, example: string) => {
//     console.log(`  ${orange.bold(name.padEnd(8))}${text}`);
//     console.log(`  ${" ".repeat(8)}${chalk.gray(example)}`);
//   };

//   console.log(chalk.cyan.bold("Welcome."));
//   console.log("");
//   console.log(
//     [
//       "Cli-bot is an AI-native terminal agent that understands",
//       "your project, operates your local development environment,",
//       "diagnoses errors, and helps you reason about your codebase",
//       "— without leaving the terminal.",
//     ].join("\n"),
//   );
//   console.log("");

//   pillar("OPERATE", "Control your environment in plain English", "cli-bot start my server");
//   pillar("DEBUG", "Errors diagnosed, fixed with your approval, verified", "EADDRINUSE :3000  →  kill 18472? [Y/n]");
//   pillar("THINK", "Chat about your actual codebase", "cli-bot chat");

//   console.log("");
//   console.log(
//     chalk.gray("Local-first: your files and commands stay on your machine.\nAI is only used for reasoning, with your own API key."),
//   );
//   console.log("");
//   console.log(rule);
//   console.log(chalk.white.bold("Let's get you set up") + chalk.gray(" — two quick questions."));
//   console.log(rule);
//   console.log("");
// }

const DESCRIPTION =
  "Cli-bot is an AI-native terminal agent that understands your project, " +
  "operates your local development environment, diagnoses errors, and helps " +
  "you reason about your codebase — without leaving the terminal.";

function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    if (current && (current + " " + word).length > width) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function printLogo(): void {
  const orange = chalk.hex("#FF8C00");
  const logoWidth = Math.max(...octopusLines.map((l) => l.length));
  const gap = "   ";
  const MIN_TEXT = 28;
  const MAX_TEXT = 44;

  const columns = process.stdout.columns || 80;
  const available = columns - logoWidth - gap.length;
  const sideBySide = available >= MIN_TEXT;
  const textWidth = Math.min(available, MAX_TEXT);

  const side = [
    orange.bold("CLI-BOT"),
    chalk.gray("terminal developer assistant"),
    "",
    ...wrap(DESCRIPTION, sideBySide ? textWidth : columns),
  ];

  console.log("");
  if (!sideBySide) {
    for (const line of octopusLines) console.log(orange(line));
    console.log("");
    for (const line of side) console.log(line);
    console.log("");
    return;
  }


  const top = Math.max(0, Math.floor((octopusLines.length - side.length) / 2));
  const rows = Math.max(octopusLines.length, top + side.length);
  for (let i = 0; i < rows; i++) {
    const art = (octopusLines[i] ?? "").padEnd(logoWidth);
    const text = side[i - top] ?? "";
    console.log(orange(art) + gap + text);
  }
  console.log("");
}

function printIntro(): void {
  const orange = chalk.hex("#FF8C00");
  const rule = chalk.gray("─".repeat(58));
  const pillar = (name: string, text: string, example: string) => {
    console.log(`  ${orange.bold(name.padEnd(8))}${text}`);
    console.log(`  ${" ".repeat(8)}${chalk.gray(example)}`);
  };


  console.log("");

  pillar("OPERATE", "Control your environment in plain English", "cli-bot start my server");
  pillar("DEBUG", "Errors diagnosed, fixed with your approval, verified", "EADDRINUSE :3000  →  kill 18472? [Y/n]");
  pillar("THINK", "Chat about your actual codebase", "cli-bot chat");

  console.log("");
  console.log(
    chalk.gray("Local-first: your files and commands stay on your machine.\nAI is only used for reasoning, with your own API key."),
  );
  console.log("");
  console.log(rule);
  console.log(chalk.white.bold("Let's get you set up") + chalk.gray(" — two quick questions."));
  console.log(rule);
  console.log("");
}


export const initialiseIfNeeded = async () => {
  const workspacePath = process.cwd();
  const cliBotDir = getCliBotDir();
  const dbPath = path.join(cliBotDir, "cli-bot.db");


  await initDb(cliBotDir);
  await initQueue(cliBotDir);
  registerHandler();
  startDispatcher();
  const user = await readTable("users");
  const device = await readTable("devices");


  if (user && device) {
    return { user, device, workspacePath };
  }


  try {
    const userInfo = await getUserInfo();
    const deviceInfo = getDeviceInfo("V1.0.0");

    const [newUser, newDevice] = await saveTransaction([
      { table: "users", data: userInfo },
      { table: "devices", data: ([u]: [User]) => ({ ...deviceInfo, owner_id: u.user_id }) },
    ]);

    // TODO: create and save user preferences
    return { user: newUser, device: newDevice, workspacePath };
  } catch (error) {
    throw new Error(`Failed to initialize DB: ${error}`, { cause: error });
  }
};

interface WorkspaceInfo {
  workspace_name: string;
  workspace_description: string;
  owner_id: string;
  created_at: string;
}

async function getWorkspaceInfo(user_id: string): Promise<WorkspaceInfo> {
  const workspace_name = await input({
    message: chalk.yellow("Enter workspace name: "),
  });

  const workspace_description = await input({
    message: chalk.yellow("What are you building here? A quick line helps cli-bot understand your project: "),
  });


  const now = new Date().toISOString();

  return {
    workspace_name,
    workspace_description,
    owner_id: user_id,
    created_at: now
  };
}

export interface Wd {
  workspace_id: string,
  device_id: string,
  path: string
}

export const resolveWorkspace = async (UserInfo: { user: any; device: any; workspacePath: string; }) => {
  const { user, device, workspacePath } = UserInfo;
  const wd = await findInTable("workspace_devices", {
    device_id: device.device_id,
    path: workspacePath
  })

  if (wd === false) {
    const info = await getWorkspaceInfo(user.user_id); // prompts happen BEFORE the transaction

    const [, workspace_devices] = await saveTransaction([
      { table: "workspaces", data: info },
      {
        table: "workspace_devices",
        data: ([workspace]: [WorkspaceDevice]) => ({
          workspace_id: workspace.workspace_id,
          path: workspacePath,
          device_id: device.device_id,
        }),
      },
    ]);

    return workspace_devices;
  }


  return wd
}



export interface SessionInfo {
  workspace_id: string;
  device_id: string;
  started_at: string;
  ended_at: string | null;
  status: SessionStatus;
}


function getSessionInfo(workspaceId: string, deviceId: string): SessionInfo {
  return {
    workspace_id: workspaceId,
    device_id: deviceId,
    started_at: new Date().toISOString(),
    ended_at: null,
    status: SessionStatus.ACTIVE,
  };
}

export const createSession = async (wd: Wd) => {
  const session = await saveToTable("sessions", getSessionInfo(wd.workspace_id, wd.device_id));
  return session
}

async function endSession(session: Session): Promise<void> {
  try {
    await saveToTable("sessions", {
      session_id: session.session_id,
      ended_at: new Date().toISOString(),
      status: SessionStatus.ENDED,
    });
  } catch (err) {
    console.error("failed to end session:", err);
  }
}

export interface SaveInputResult {
  input_id: string;
  correlation_id: string;
}


async function handleUserInput(
  userInput: string,
  sessionId: string
): Promise<SaveInputResult> {
  const correlationId = randomUUID();
  const createdAt = new Date().toISOString();

  const inputPayload = {
    session_id: sessionId,
    correlation_id: correlationId,
    message: userInput,
    created_at: createdAt,
  };


  const savedInput: Input = await saveToTable("inputs", inputPayload);

  console.time(`job-${correlationId}`);
  await publish({
    event_type: EventType.INPUT_RECEIVED,
    data: {
      message: userInput,

    },
    source_component: EventSource.I_O,
    entity_type: EventEntityType.INPUT,
    entity_id: savedInput.input_id,
    correlation_id: correlationId,
    actionable: true,
  });

  return {
    input_id: savedInput.input_id,
    correlation_id: savedInput.correlation_id,
  };
}

const dim = chalk.dim;


function buildPrompt(): string {
  const cwd = process.cwd();
  const home = os.homedir();
  const shown = cwd.startsWith(home) ? "~" + cwd.slice(home.length) : cwd;
  return `${chalk.dim("@cli-bot")} ${chalk.green(shown)}${chalk.white(": ")}`;
}

export function launchRuntime(session: Session): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    prompt: buildPrompt(),
  });

  setRl(rl)
  let shuttingDown = false;

  rl.prompt();

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (trimmed === "") {
      rl.setPrompt(buildPrompt());
      rl.prompt();
      return;
    }

    // TODO: send to the Main I/O Pipeline
    await handleUserInput(trimmed, session.session_id);
    // const handlers = registry.getHandlers(EventType.INPUT_RECEIVED);
    // for (const h of handlers) {
    //   await h.fn({ message: trimmed });
    // }

    rl.setPrompt(buildPrompt()); // refresh in case the directory changed
    rl.prompt();
  });

  rl.on("SIGINT", () => rl.close()); // Ctrl+C in raw mode goes here

  rl.on("close", async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    await endSession(session);
    await stopQueue();
    console.log(`\n${dim("bye.")}`);
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    await endSession(session);
    await stopQueue();
    console.log(`\n${dim("bye.")}`);
    process.exit(0);
  });
}

// TO-DO : Fix empty entry for any user input
//TO-DO : include tests for the initQueue and stopQueue actions