import path from "path";
import fs from "fs";
import chalk from "chalk";
import os, { userInfo } from "node:os";
import { input } from "@inquirer/prompts";
import { saveToTable, readTable } from "../repository/repo.js";


import { getCliBotDir } from "../utils/filesystem.js";
import { initDb } from "../repository/initDb.js";
import { OSname, SynchronizationState } from "../database/enums/enum.js";
import type { User } from "../utils/types.js";

export interface DeviceInfo {
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

export function getDeviceInfo(appVersion: string): DeviceInfo {
  const now = new Date().toISOString();
  const platform = os.platform();
  const hostname = os.hostname();
  const arch = os.arch();

  return {
    installation_id: "install-1",
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
    case "linux":  return OSname.LINUX;
    case "darwin": return OSname.MACOS;
    case "win32":  return OSname.WINDOWS;
    default:       return OSname.UNKNOWN;
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
  if (platform === "linux")  return `Linux (${arch})`;
  if (platform === "win32")  return `PC (${arch})`;
  return `Unknown (${arch})`;
}

function getManufacturer(platform: NodeJS.Platform): string {
  if (platform === "darwin") return "Apple";
  if (platform === "win32")  return "Microsoft";
  if (platform === "linux")  return "Linux";
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



export interface UserInfo {
  username: string;
  user_description: string;
}

export async function getUserInfo(): Promise<UserInfo> {
  printLogo();
  printIntro();

  const username = await input({
    message: chalk.yellow("Enter your name: "),
  });

  const user_description = await input({
    message: chalk.yellow("Enter a short description about yourself: "),
  });

  return { username, user_description };
}

function printLogo(): void {
  console.log("");
  for (const line of octopusLines) {
    console.log(chalk.hex("#FF8C00")(line));   // orange
  }
  console.log("");
  console.log(
    chalk.hex("#FF8C00").bold("              CLI-BOT") +
      chalk.gray("   ·   terminal developer assistant"),
  );
  console.log("");
}

function printIntro(): void {
  console.log(
    chalk.cyan("Welcome.") +
      " Cli-bot is your terminal-based developer assistant.",
  );
  console.log(
    chalk.gray("It runs anywhere, remembers your workspace, and chats in the terminal."),
  );
  console.log("");
  console.log(chalk.white.bold("Let's get you set up — two quick questions."));
  console.log("");
}

export const initialiseIfNeeded = async () => {
  const workspacePath = process.cwd();
  const dbPath = path.join(getCliBotDir(), "cli-bot.db");
  const isFirstRun = !fs.existsSync(dbPath);

  await initDb(getCliBotDir());

  if (!isFirstRun) {
    const user = await readTable("users");
    const device = await readTable("devices");
    return { user, device, workspacePath };
  }

  try {
    const user = await saveToTable("users", await getUserInfo());
    const info = getDeviceInfo("V1.0.0");
    const device = await saveToTable("devices", 
      {
  ...info,
  owner_id: user.user_id,
});

     // TODO: create and save user preferences
    return { user, device, workspacePath };
  } catch (error) {
    throw new Error(`Failed to initialize DB: ${error}`, { cause: error });
  }
};