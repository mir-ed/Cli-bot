import "reflect-metadata";
import path from "node:path";
import os from "node:os";
import { DataSource } from "typeorm";


const here: string =
  typeof __dirname !== "undefined" ? __dirname : import.meta.dirname;

const dbPath = path.resolve(process.cwd(), ".local-data/cli-bot.db/cli-bot.db");

export const AppDataSource = new DataSource({
  type: "better-sqlite3",
  database: dbPath,
  entities: [path.join(here, "entities/**/*.{ts,js}")],
  migrations: [path.join(here, "migrations/**/*.{ts,js}")],
  synchronize: false,
});

//export default AppDataSource;