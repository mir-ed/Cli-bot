import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getCliBotDir } from "./filesystem.js";


export function getInstallationId(): string {
  const idPath = path.join(getCliBotDir(), ".installation-id");

  if (fs.existsSync(idPath)) {
    return fs.readFileSync(idPath, "utf8").trim();
  }

  const id = crypto.randomUUID();
  fs.writeFileSync(idPath, id, { mode: 0o600 });
  return id;
}