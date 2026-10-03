
import { getDb } from "./initDb.js";
import { User } from "../database/entities/User.js";
import { Device } from "../database/entities/Device.js";
import { Workspace } from "../database/entities/Workspace.js";
import { WorkspaceDevice } from "../database/entities/WorkspaceDevice.js";
import { Session } from "../database/entities/Session.js";
import { UserConfigPreferences } from "../database/entities/UserConfigPreferences.js";
import { UserSecretsCredentials } from "../database/entities/UserSecretsCredentials.js";
import { Event } from "../database/entities/Event.js";
import { Input } from "../database/entities/Input.js";
import { Process } from "../database/entities/Process.js";
import { ProcessOutput } from "../database/entities/ProcessOutput.js";
import { Request } from "../database/entities/Request.js";
import { AIResponse } from "../database/entities/AIResponse.js";
import { ActionProposal } from "../database/entities/ActionProposal.js";

const entityMap: Record<string, any> = {
  users: User,
  devices: Device,
  workspaces: Workspace,
  workspace_devices: WorkspaceDevice,
  sessions: Session,
  user_config_preferences: UserConfigPreferences,
  user_secrets_credentials: UserSecretsCredentials,
  events: Event,
  inputs: Input,
  processes: Process,
  process_outputs: ProcessOutput,
  requests: Request,
  ai_responses: AIResponse,
  action_proposals: ActionProposal,
};


export async function saveToTable(tableName: string, data: any) {
    if (!Object.hasOwn(entityMap, tableName)) 
        throw new Error(`Unknown table: ${tableName}`);
    const entity = entityMap[tableName];
    const db = getDb();
    return db.getRepository(entity).save(data);
}

export async function readTable(tableName: string) {
  if (!Object.hasOwn(entityMap, tableName))
    throw new Error(`Unknown table: ${tableName}`);
  const entity = entityMap[tableName];
  const db = getDb();
  return db.getRepository(entity).findOne({ where: {} , loadRelationIds: true,});
}

export async function existsInTable(
  tableName: string,
  where: Record<string, any>,
): Promise<boolean> {
  if (!Object.hasOwn(entityMap, tableName))
    throw new Error(`Unknown table: ${tableName}`);
  const entity = entityMap[tableName];
  const db = getDb();
  return db.getRepository(entity).exists({ where });
}

export async function findInTable(
  tableName: string,
  where: Record<string, any>,
): Promise<any | false> {
  if (!Object.hasOwn(entityMap, tableName))
    throw new Error(`Unknown table: ${tableName}`);

  const entity = entityMap[tableName];
  const db = getDb();
  const row = await db.getRepository(entity).findOne({ where });
  return row ?? false;
}