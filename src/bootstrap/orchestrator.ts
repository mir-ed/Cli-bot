import { initialiseIfNeeded, resolveWorkspace, createSession, launchRuntime} from "./bootstrapTools.js"
import type { Wd } from "./bootstrapTools.js";
import chalk  from "chalk";


export const init = async () => {
  try {
    const userInfo = await initialiseIfNeeded();
    const wd: Wd = await resolveWorkspace(userInfo);

    const session = await createSession(wd);
    launchRuntime(session)


    return { userInfo, wd, session };
  } catch (error) {
    console.error(
      chalk.red("Failed to start cli-bot:"),
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
};
