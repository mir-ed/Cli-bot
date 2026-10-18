// 

import { LiteQ } from "@km-dev/lite-q";
import "reflect-metadata";
import path from "node:path";
import { DataSource } from "typeorm";
import os from "node:os";

// entities

import {
  User, Device, Session, Workspace, WorkspaceDevice, UserConfigPreferences,
  UserSecretsCredentials, Event, Input, Process, ProcessOutput,
  Request, AIResponse, ActionProposal, Outbox, Dispatch
} from "../database/entities/index.js";

// migrations
import {
  InitialSchema1790275323707, ChangeIdsToUuid1790598515205,
  IncludeGeneratedId1790603918153, CreateOutboxAndDispatch1792276299203
} from "../database/migrations/index.js";


let dataSource: DataSource | null = null;

export async function initDb(dataPath: string): Promise<void> {
  if (dataSource) return;

  dataSource = new DataSource({
    type: "better-sqlite3",
    database: path.join(dataPath, "cli-bot.db"),
    enableWAL: true, // PRAGMA journal_mode = WAL
    prepareDatabase: (db) => {
      db.pragma("busy_timeout = 5000");
      db.pragma("synchronous = NORMAL");
      db.pragma("foreign_keys = ON");
    },
    entities: [
      User, Device, Session, Workspace,
      WorkspaceDevice, UserConfigPreferences, UserSecretsCredentials, Event,
      Input, Process, ProcessOutput, Request,
      AIResponse, ActionProposal, Outbox, Dispatch
    ],
    migrations: [
      InitialSchema1790275323707,
      ChangeIdsToUuid1790598515205,
      IncludeGeneratedId1790603918153,
      CreateOutboxAndDispatch1792276299203
    ],
    synchronize: false,
  });

  await dataSource.initialize();
  await dataSource.runMigrations();
}

export function getDb(): DataSource {
  if (dataSource) return dataSource;
  throw new Error("Database not initialized");
}



function getWorkerCount(): number {
  const cores = os.cpus().length;


  const available = Math.max(1, cores - 1);

  return Math.min(available, 8);

}

let queue: LiteQ | null = null;

export async function initQueue(dataPath: string): Promise<void> {
  if (queue) return;

  queue = new LiteQ({
    storagePath: path.join(dataPath, "cli-bot-jobs.db"),
    concurrency: 2,
    minWorkers: 1,
    maxWorkers: getWorkerCount(),
  });

  await queue.start();
}

export function getQueue(): LiteQ {
  if (!queue) throw new Error("Queue not initialized. Call initQueue() first.");
  return queue;
}

export async function stopQueue(): Promise<void> {
  if (!queue) return;
  await queue.stop();
  queue = null;
}

//TO-DO : Write tests for the initQueue, stopeQueue and all jobs related fucntions.
