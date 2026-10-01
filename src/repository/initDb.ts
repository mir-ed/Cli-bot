import "reflect-metadata";
import path from "node:path";
import { DataSource } from "typeorm";

// entities
import { User } from "../database/entities/User.js";
import { Device } from "../database/entities/Device.js";
import { Session } from "../database/entities/Session.js";
import { Workspace } from "../database/entities/Workspace.js";
import { WorkspaceDevice } from "../database/entities/WorkspaceDevice.js";
import { UserConfigPreferences } from "../database/entities/UserConfigPreferences.js";
import { UserSecretsCredentials } from "../database/entities/UserSecretsCredentials.js";
import { Event } from "../database/entities/Event.js";
import { Input } from "../database/entities/Input.js";
import { Process } from "../database/entities/Process.js";
import { ProcessOutput } from "../database/entities/ProcessOutput.js";
import { Request } from "../database/entities/Request.js";
import { AIResponse } from "../database/entities/AIResponse.js";
import { ActionProposal } from "../database/entities/ActionProposal.js";

// migrations
import { InitialSchema1790275323707 } from "../database/migrations/1790275323707-InitialSchema.js";
import { ChangeIdsToUuid1790598515205 } from "../database/migrations/1790598515205-ChangeIdsToUuid.js";
import { IncludeGeneratedId1790603918153 } from "../database/migrations/1790603918153-IncludeGeneratedId.js";



let dataSource: DataSource | null = null;

export async function initDb(dataPath: string): Promise<void> {
  if (dataSource) return;

  dataSource = new DataSource({
    type: "better-sqlite3",
    database: path.join(dataPath, "cli-bot.db"),
    entities: [
      User,
      Device,
      Session,
      Workspace,
      WorkspaceDevice,
      UserConfigPreferences,
      UserSecretsCredentials,
      Event,
      Input,
      Process,
      ProcessOutput,
      Request,
      AIResponse,
      ActionProposal,
    ],
    migrations: [InitialSchema1790275323707, ChangeIdsToUuid1790598515205, IncludeGeneratedId1790603918153 ],
    synchronize: false,
  });

  await dataSource.initialize();
  await dataSource.runMigrations();
}

export function getDb(): DataSource {
  if (dataSource) return dataSource;
  throw new Error("Database not initialized");
}