import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";

// ---------------------------------------------------------------------------
// Hoisted mock handles (vi.mock factories are hoisted above imports)
// ---------------------------------------------------------------------------
const m = vi.hoisted(() => ({
  readFileSync: vi.fn(),
  platform: vi.fn(),
  hostname: vi.fn(),
  arch: vi.fn(),
  release: vi.fn(),
  userInfo: vi.fn(),
  input: vi.fn(),
  saveToTable: vi.fn(),
  saveTransaction: vi.fn(),
  readTable: vi.fn(),
  findInTable: vi.fn(),
  initDb: vi.fn(),
  getCliBotDir: vi.fn(),
  createInterface: vi.fn(),
  runDevMode: vi.fn(),
  getInstallationId: vi.fn(),
}));

vi.mock("fs", () => ({
  default: { readFileSync: m.readFileSync },
}));

vi.mock("node:os", () => ({
  default: {
    platform: m.platform,
    hostname: m.hostname,
    arch: m.arch,
    release: m.release,
  },
  userInfo: m.userInfo,
}));

vi.mock("node:readline", () => ({
  default: { createInterface: m.createInterface },
  Interface: class {},
}));

vi.mock("@inquirer/prompts", () => ({ input: m.input }));

vi.mock("../repository/repo.js", () => ({
  saveToTable: m.saveToTable,
  saveTransaction: m.saveTransaction,
  readTable: m.readTable,
  findInTable: m.findInTable,
}));

vi.mock("../utils/installationId.js", () => ({
  getInstallationId: m.getInstallationId,
}));
vi.mock("../repository/initDb.js", () => ({ initDb: m.initDb }));
vi.mock("../utils/filesystem.js", () => ({ getCliBotDir: m.getCliBotDir }));
vi.mock("../cli/dev.js", () => ({ runDevMode: m.runDevMode }));
vi.mock("gradient-string", () => ({ default: vi.fn() }));

import {
  initialiseIfNeeded,
  resolveWorkspace,
  createSession,
  launchRuntime,
} from "./bootstrapTools.js";
import {
  OSname,
  SessionStatus,
  SynchronizationState,
} from "../database/enums/enum.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const NOW = new Date("2026-03-01T10:00:00.000Z");
const NOW_ISO = NOW.toISOString();
const CLI_DIR = "/home/tester/.cli-bot";
const WORKSPACE_PATH = "/work/proj";

const ANSI = /\u001b\[[0-9;]*m/g;
const strip = (value: unknown): string => String(value).replace(ANSI, "");

let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let exitSpy: ReturnType<typeof vi.spyOn>;

const loggedText = (): string =>
  logSpy.mock.calls.map((call: unknown[]) => call.map(strip).join(" ")).join("\n");

// Every write passed to the mocked saveTransaction, with function payloads
// already resolved against the results of the earlier writes.
let resolvedWrites: { table: string; data: any }[];

// Fake saveTransaction: runs the writes in order, resolves `data` functions
// against earlier results (like the real one), and returns `rows` in order.
function mockTransaction(rows: any[]) {
  m.saveTransaction.mockImplementation(
    async (writes: { table: string; data: any }[]) => {
      const results: any[] = [];
      for (const [i, { table, data }] of writes.entries()) {
        const payload = typeof data === "function" ? data(results) : data;
        resolvedWrites.push({ table, data: payload });
        results.push(rows[i]);
      }
      return results;
    },
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  resolvedWrites = [];
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);

  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  exitSpy = vi
    .spyOn(process, "exit")
    .mockImplementation((() => undefined) as never);
  vi.spyOn(process, "cwd").mockReturnValue(WORKSPACE_PATH);

  m.getCliBotDir.mockReturnValue(CLI_DIR);
  m.getInstallationId.mockReturnValue("install-test-id");
  m.initDb.mockResolvedValue(undefined);
  m.platform.mockReturnValue("linux");
  m.hostname.mockReturnValue("dev-box");
  m.arch.mockReturnValue("x64");
  m.release.mockReturnValue("6.5.0-test");
  m.readFileSync.mockReturnValue('NAME="Ubuntu"\nVERSION_ID="22.04"\n');
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// initialiseIfNeeded
// ---------------------------------------------------------------------------
describe("initialiseIfNeeded", () => {
  const USER = {
    user_id: "user-1",
    username: "Ada",
    user_description: "backend dev",
  };
  const DEVICE = { device_id: "dev-1" };

  // readTable returns the stored rows (already bootstrapped).
  function arrangeBootstrapped() {
    m.readTable.mockImplementation(async (table: string) =>
      table === "users" ? USER : DEVICE,
    );
  }

  // readTable finds nothing, so onboarding runs and the transaction saves.
  function arrangeFirstRun() {
    m.readTable.mockResolvedValue(null);
    m.input.mockResolvedValueOnce("Ada").mockResolvedValueOnce("backend dev");
    mockTransaction([USER, DEVICE]);
  }

  function devicePayload(): Record<string, unknown> {
    return resolvedWrites[1]!.data;
  }

  describe("when the user and device already exist (already bootstrapped)", () => {
    beforeEach(() => {
      arrangeBootstrapped();
    });

    it("returns the stored user and device with the current working directory", async () => {
      const result = await initialiseIfNeeded();

      expect(result).toEqual({
        user: USER,
        device: DEVICE,
        workspacePath: WORKSPACE_PATH,
      });
    });

    it("reads the users and devices tables", async () => {
      await initialiseIfNeeded();

      expect(m.readTable).toHaveBeenCalledTimes(2);
      expect(m.readTable).toHaveBeenCalledWith("users");
      expect(m.readTable).toHaveBeenCalledWith("devices");
    });

    it("does not prompt, write to the DB, or print the welcome screen", async () => {
      await initialiseIfNeeded();

      expect(m.input).not.toHaveBeenCalled();
      expect(m.saveToTable).not.toHaveBeenCalled();
      expect(m.saveTransaction).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();
    });

    it("still runs initDb so the connection is available", async () => {
      await initialiseIfNeeded();

      expect(m.initDb).toHaveBeenCalledWith(CLI_DIR);
    });
  });

  describe("bootstrap detection", () => {
    it("runs initDb BEFORE reading the users table", async () => {
      arrangeBootstrapped();

      await initialiseIfNeeded();

      const initOrder = m.initDb.mock.invocationCallOrder[0]!;
      const readOrder = m.readTable.mock.invocationCallOrder[0]!;
      expect(initOrder).toBeLessThan(readOrder);
    });

    it("propagates initDb failures unwrapped and does not read, prompt or save", async () => {
      const failure = new Error("cannot open db");
      m.initDb.mockRejectedValue(failure);

      await expect(initialiseIfNeeded()).rejects.toBe(failure);
      expect(m.readTable).not.toHaveBeenCalled();
      expect(m.input).not.toHaveBeenCalled();
      expect(m.saveToTable).not.toHaveBeenCalled();
      expect(m.saveTransaction).not.toHaveBeenCalled();
    });

    it("runs onboarding when both tables are empty", async () => {
      arrangeFirstRun();

      const result = await initialiseIfNeeded();

      expect(m.input).toHaveBeenCalledTimes(2);
      expect(m.saveTransaction).toHaveBeenCalledTimes(1);
      expect(result.user).toBe(USER);
      expect(result.device).toBe(DEVICE);
    });

    it("runs onboarding when the db exists but has no user (setup stopped halfway)", async () => {
      m.readTable.mockImplementation(async (table: string) =>
        table === "devices" ? DEVICE : null,
      );
      m.input.mockResolvedValueOnce("Ada").mockResolvedValueOnce("backend dev");
      mockTransaction([USER, DEVICE]);

      await initialiseIfNeeded();

      expect(m.input).toHaveBeenCalledTimes(2);
      expect(m.saveTransaction).toHaveBeenCalledTimes(1);
    });

    it("runs onboarding when the user exists but the device is missing", async () => {
      m.readTable.mockImplementation(async (table: string) =>
        table === "users" ? USER : null,
      );
      m.input.mockResolvedValueOnce("Ada").mockResolvedValueOnce("backend dev");
      mockTransaction([USER, DEVICE]);

      await initialiseIfNeeded();

      expect(m.input).toHaveBeenCalledTimes(2);
      expect(m.saveTransaction).toHaveBeenCalledTimes(1);
    });

    it("asks again on the next run after the user aborted the prompts", async () => {
      m.readTable.mockResolvedValue(null);
      m.input.mockRejectedValueOnce(new Error("User force closed the prompt"));

      await expect(initialiseIfNeeded()).rejects.toThrow("Failed to initialize DB:");
      expect(m.saveTransaction).not.toHaveBeenCalled();

      m.input.mockResolvedValueOnce("Ada").mockResolvedValueOnce("backend dev");
      mockTransaction([USER, DEVICE]);

      const result = await initialiseIfNeeded();

      expect(result.user).toBe(USER);
      expect(m.saveTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe("when it is the first run", () => {
    beforeEach(() => {
      m.readTable.mockResolvedValue(null);
    });

    it("prints the logo and welcome text", async () => {
      arrangeFirstRun();

      await initialiseIfNeeded();

      const text = loggedText();
      expect(text).toContain("CLI-BOT");
      expect(text).toContain("terminal developer assistant");
      expect(text).toContain("Welcome.");
      expect(text).toContain("two quick questions");
    });

    it("asks for the user's name and description, in that order", async () => {
      arrangeFirstRun();

      await initialiseIfNeeded();

      expect(m.input).toHaveBeenCalledTimes(2);
      expect(strip(m.input.mock.calls[0]![0].message)).toContain("Enter your name");
      expect(strip(m.input.mock.calls[1]![0].message)).toContain(
        "Tell cli-bot who you are",
      );
    });

    it("saves the user with exactly the answers that were typed", async () => {
      arrangeFirstRun();

      await initialiseIfNeeded();

      expect(resolvedWrites[0]).toEqual({
        table: "users",
        data: {
          username: "Ada",
          user_description: "backend dev",
        },
      });
    });

    it("allows an empty (optional) description", async () => {
      m.input.mockResolvedValueOnce("Ada").mockResolvedValueOnce("");
      mockTransaction([USER, DEVICE]);

      await initialiseIfNeeded();

      expect(resolvedWrites[0]).toEqual({
        table: "users",
        data: {
          username: "Ada",
          user_description: "",
        },
      });
    });

    it("saves the user and device in a single transaction", async () => {
      arrangeFirstRun();

      await initialiseIfNeeded();

      expect(m.saveTransaction).toHaveBeenCalledTimes(1);
      expect(m.saveToTable).not.toHaveBeenCalled();
      const writes = m.saveTransaction.mock.calls[0]![0];
      expect(writes.map((w: { table: string }) => w.table)).toEqual([
        "users",
        "devices",
      ]);
    });

    it("saves the device owned by the newly created user", async () => {
      arrangeFirstRun();

      await initialiseIfNeeded();

      expect(resolvedWrites).toHaveLength(2);
      expect(resolvedWrites[1]!.table).toBe("devices");
      expect(devicePayload().owner_id).toBe("user-1");
    });

    it("returns the saved user, saved device and workspace path", async () => {
      arrangeFirstRun();

      const result = await initialiseIfNeeded();

      expect(result).toEqual({
        user: USER,
        device: DEVICE,
        workspacePath: WORKSPACE_PATH,
      });
    });

    it("builds a complete device record for a Linux machine", async () => {
      arrangeFirstRun();

      await initialiseIfNeeded();

      expect(devicePayload()).toEqual({
        installation_id: "install-test-id",
        device_name: "dev-box",
        device_label: "dev-box",
        os_name: OSname.LINUX,
        os_version: "6.5.0-test",
        os_build: "22.04",
        architecture: "x64",
        device_model: "Linux (x64)",
        device_manufacturer: "Linux",
        hostname: "dev-box",
        app_version: "V1.0.0",
        synchronization_state: SynchronizationState.PENDING,
        updated_at: NOW_ISO,
        last_seen: NOW_ISO,
        created_at: NOW_ISO,
        owner_id: "user-1",
      });
    });

    describe("platform mapping", () => {
      it.each([
        ["linux", "x64", OSname.LINUX, "Linux (x64)", "Linux", "22.04"],
        ["darwin", "arm64", OSname.MACOS, "Mac (arm64)", "Apple", "6.5.0-test"],
        ["win32", "x64", OSname.WINDOWS, "PC (x64)", "Microsoft", "6.5.0-test"],
        ["freebsd", "x64", OSname.UNKNOWN, "Unknown (x64)", "Unknown", "6.5.0-test"],
      ])(
        "%s/%s -> os_name, model, manufacturer and build",
        async (platform, arch, osName, model, manufacturer, build) => {
          m.platform.mockReturnValue(platform);
          m.arch.mockReturnValue(arch);
          arrangeFirstRun();

          await initialiseIfNeeded();

          expect(devicePayload()).toMatchObject({
            os_name: osName,
            architecture: arch,
            device_model: model,
            device_manufacturer: manufacturer,
            os_build: build,
          });
        },
      );

      it("only reads /etc/os-release on Linux", async () => {
        m.platform.mockReturnValue("darwin");
        arrangeFirstRun();

        await initialiseIfNeeded();

        expect(m.readFileSync).not.toHaveBeenCalled();
      });
    });

    describe("os_build detection on Linux", () => {
      it("reads /etc/os-release as utf8", async () => {
        arrangeFirstRun();

        await initialiseIfNeeded();

        expect(m.readFileSync).toHaveBeenCalledWith("/etc/os-release", "utf8");
      });

      it("uses a quoted VERSION_ID", async () => {
        m.readFileSync.mockReturnValue('ID=ubuntu\nVERSION_ID="24.04"\nNAME=x\n');
        arrangeFirstRun();

        await initialiseIfNeeded();

        expect(devicePayload().os_build).toBe("24.04");
      });

      it("uses an unquoted VERSION_ID", async () => {
        m.readFileSync.mockReturnValue("ID=debian\nVERSION_ID=12\n");
        arrangeFirstRun();

        await initialiseIfNeeded();

        expect(devicePayload().os_build).toBe("12");
      });

      it.each([
        ["VERSION_ID is missing", 'NAME="Arch Linux"\nID=arch\n'],
        ["VERSION_ID is empty", 'NAME="x"\nVERSION_ID=""\n'],
        ["the file is empty", ""],
      ])("falls back to os.release() when %s", async (_label, contents) => {
        m.readFileSync.mockReturnValue(contents);
        arrangeFirstRun();

        await initialiseIfNeeded();

        expect(devicePayload().os_build).toBe("6.5.0-test");
      });

      it("falls back to os.release() when the file cannot be read", async () => {
        m.readFileSync.mockImplementation(() => {
          throw new Error("ENOENT");
        });
        arrangeFirstRun();

        await expect(initialiseIfNeeded()).resolves.toBeDefined();

        expect(devicePayload().os_build).toBe("6.5.0-test");
      });
    });

    describe("error handling", () => {
      it("wraps a failure saving the user and preserves the cause", async () => {
        const cause = new Error("db down");
        m.input.mockResolvedValue("x");
        m.saveTransaction.mockRejectedValueOnce(cause);

        const error = await initialiseIfNeeded().catch((e) => e);

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe("Failed to initialize DB: Error: db down");
        expect(error.cause).toBe(cause);
      });

      it("wraps a failure saving the device (whole transaction is rolled back)", async () => {
        const cause = new Error("constraint failed");
        m.input.mockResolvedValue("x");
        m.saveTransaction.mockRejectedValueOnce(cause);

        const error = await initialiseIfNeeded().catch((e) => e);

        expect(error.message).toBe("Failed to initialize DB: Error: constraint failed");
        expect(error.cause).toBe(cause);
        expect(m.saveTransaction).toHaveBeenCalledTimes(1);
      });

      it("wraps a prompt failure (e.g. user aborts) and saves nothing", async () => {
        const cause = new Error("User force closed the prompt");
        m.input.mockRejectedValueOnce(cause);

        const error = await initialiseIfNeeded().catch((e) => e);

        expect(error.message).toContain("Failed to initialize DB:");
        expect(error.cause).toBe(cause);
        expect(m.saveToTable).not.toHaveBeenCalled();
        expect(m.saveTransaction).not.toHaveBeenCalled();
      });
    });
  });
});

// ---------------------------------------------------------------------------
// resolveWorkspace
// ---------------------------------------------------------------------------
describe("resolveWorkspace", () => {
  const user = { user_id: "user-1" };
  const device = { device_id: "dev-1" };
  const ctx = { user, device, workspacePath: WORKSPACE_PATH };

  it("looks the workspace up by device id and path", async () => {
    m.findInTable.mockResolvedValue({ workspace_id: "w1" });

    await resolveWorkspace(ctx);

    expect(m.findInTable).toHaveBeenCalledWith("workspace_devices", {
      device_id: "dev-1",
      path: WORKSPACE_PATH,
    });
  });

  describe("when the workspace is already registered on this device", () => {
    const existing = { workspace_id: "w1", device_id: "dev-1", path: WORKSPACE_PATH };

    beforeEach(() => {
      m.findInTable.mockResolvedValue(existing);
    });

    it("returns the existing link", async () => {
      await expect(resolveWorkspace(ctx)).resolves.toBe(existing);
    });

    it("does not prompt or write anything", async () => {
      await resolveWorkspace(ctx);

      expect(m.input).not.toHaveBeenCalled();
      expect(m.saveToTable).not.toHaveBeenCalled();
      expect(m.saveTransaction).not.toHaveBeenCalled();
    });
  });

  describe("when the workspace is new (findInTable returns false)", () => {
    const createdWorkspace = { workspace_id: "w-new" };
    const createdLink = {
      workspace_id: "w-new",
      device_id: "dev-1",
      path: WORKSPACE_PATH,
    };

    beforeEach(() => {
      m.findInTable.mockResolvedValue(false);
      m.input.mockResolvedValueOnce("my-app").mockResolvedValueOnce("a todo API");
      mockTransaction([createdWorkspace, createdLink]);
    });

    it("asks for the workspace name and description, in that order", async () => {
      await resolveWorkspace(ctx);

      expect(m.input).toHaveBeenCalledTimes(2);
      expect(strip(m.input.mock.calls[0]![0].message)).toContain(
        "Enter workspace name",
      );
      expect(strip(m.input.mock.calls[1]![0].message)).toContain(
        "What are you building here?",
      );
    });

    it("asks the questions BEFORE opening the transaction", async () => {
      await resolveWorkspace(ctx);

      const lastPrompt = m.input.mock.invocationCallOrder[1]!;
      const txOrder = m.saveTransaction.mock.invocationCallOrder[0]!;
      expect(lastPrompt).toBeLessThan(txOrder);
    });

    it("creates the workspace owned by the user, with a creation timestamp", async () => {
      await resolveWorkspace(ctx);

      expect(resolvedWrites[0]).toEqual({
        table: "workspaces",
        data: {
          workspace_name: "my-app",
          workspace_description: "a todo API",
          owner_id: "user-1",
          created_at: NOW_ISO,
        },
      });
    });

    it("links the new workspace to this device and path", async () => {
      await resolveWorkspace(ctx);

      expect(resolvedWrites[1]).toEqual({
        table: "workspace_devices",
        data: {
          workspace_id: "w-new",
          path: WORKSPACE_PATH,
          device_id: "dev-1",
        },
      });
    });

    it("writes the workspace and the link in a single transaction", async () => {
      await resolveWorkspace(ctx);

      expect(m.saveTransaction).toHaveBeenCalledTimes(1);
      expect(m.saveToTable).not.toHaveBeenCalled();
      const writes = m.saveTransaction.mock.calls[0]![0];
      expect(writes.map((w: { table: string }) => w.table)).toEqual([
        "workspaces",
        "workspace_devices",
      ]);
    });

    it("returns the saved workspace_devices row", async () => {
      await expect(resolveWorkspace(ctx)).resolves.toBe(createdLink);
    });

    it("rejects when the transaction fails (nothing is partially written)", async () => {
      m.saveTransaction.mockReset();
      const failure = new Error("insert failed");
      m.saveTransaction.mockRejectedValueOnce(failure);

      await expect(resolveWorkspace(ctx)).rejects.toBe(failure);
      expect(m.saveTransaction).toHaveBeenCalledTimes(1);
      expect(m.saveToTable).not.toHaveBeenCalled();
    });
  });

  it("propagates lookup failures", async () => {
    const failure = new Error("query failed");
    m.findInTable.mockRejectedValue(failure);

    await expect(resolveWorkspace(ctx)).rejects.toBe(failure);
    expect(m.saveToTable).not.toHaveBeenCalled();
    expect(m.saveTransaction).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createSession
// ---------------------------------------------------------------------------
describe("createSession", () => {
  const wd = { workspace_id: "w1", device_id: "dev-1", path: WORKSPACE_PATH };

  it("saves an ACTIVE, not-yet-ended session for the workspace and device", async () => {
    m.saveToTable.mockResolvedValue({ session_id: "s1" });

    await createSession(wd);

    expect(m.saveToTable).toHaveBeenCalledWith("sessions", {
      workspace_id: "w1",
      device_id: "dev-1",
      started_at: NOW_ISO,
      ended_at: null,
      status: SessionStatus.ACTIVE,
    });
  });

  it("returns the saved session", async () => {
    const saved = { session_id: "s1" };
    m.saveToTable.mockResolvedValue(saved);

    await expect(createSession(wd)).resolves.toBe(saved);
  });

  it("propagates save failures", async () => {
    const failure = new Error("write failed");
    m.saveToTable.mockRejectedValue(failure);

    await expect(createSession(wd)).rejects.toBe(failure);
  });
});

// ---------------------------------------------------------------------------
// launchRuntime
// ---------------------------------------------------------------------------
describe("launchRuntime", () => {
  const session = { session_id: "s-1" } as any;

  let rl: EventEmitter & { prompt: ReturnType<typeof vi.fn> };
  let sigintBefore: Function[];

  const addedSigintListeners = () =>
    process.listeners("SIGINT").filter((l) => !sigintBefore.includes(l));

  beforeEach(() => {
    rl = Object.assign(new EventEmitter(), { prompt: vi.fn() });
    m.createInterface.mockReturnValue(rl);
    m.saveToTable.mockResolvedValue({});
    sigintBefore = process.listeners("SIGINT");
  });

  afterEach(() => {
    for (const listener of addedSigintListeners()) {
      process.off("SIGINT", listener as (...args: any[]) => void);
    }
  });

  it("prints the ready banner and exit hint", () => {
    launchRuntime(session);

    const text = loggedText();
    expect(text).toContain("cli-bot");
    expect(text).toContain("ready");
    expect(text).toContain("Ctrl+C to exit");
  });

  it("creates a terminal readline interface on stdin/stdout with a prompt", () => {
    launchRuntime(session);

    expect(m.createInterface).toHaveBeenCalledTimes(1);
    const options = m.createInterface.mock.calls[0]![0];
    expect(options.input).toBe(process.stdin);
    expect(options.output).toBe(process.stdout);
    expect(options.terminal).toBe(true);
    expect(strip(options.prompt)).toBe("› ");
  });

  it("shows the prompt immediately", () => {
    launchRuntime(session);

    expect(rl.prompt).toHaveBeenCalledTimes(1);
  });

  describe("on 'line'", () => {
    beforeEach(() => {
      launchRuntime(session);
      logSpy.mockClear();
      rl.prompt.mockClear();
    });

    it("forwards a trimmed message to the pipeline and re-prompts", () => {
      rl.emit("line", "   hello world  ");

      const pipelineCall = logSpy.mock.calls.find(
        (call: unknown[]) => strip(call[0]) === "→ pipeline:",
      );
      expect(pipelineCall).toBeDefined();
      expect(pipelineCall![1]).toBe("hello world");
      expect(rl.prompt).toHaveBeenCalledTimes(1);
    });

    it.each([[""], ["   "], ["\t"]])(
      "ignores blank input %j but re-prompts",
      (blank) => {
        rl.emit("line", blank);

        expect(logSpy).not.toHaveBeenCalled();
        expect(rl.prompt).toHaveBeenCalledTimes(1);
      },
    );

    it("handles several lines in sequence", () => {
      rl.emit("line", "one");
      rl.emit("line", "");
      rl.emit("line", "two");

      const forwarded = logSpy.mock.calls
        .filter((call: unknown[]) => strip(call[0]) === "→ pipeline:")
        .map((call: unknown[]) => call[1]);
      expect(forwarded).toEqual(["one", "two"]);
      expect(rl.prompt).toHaveBeenCalledTimes(3);
    });

    it("does not end the session while the user is typing", () => {
      rl.emit("line", "hi");

      expect(m.saveToTable).not.toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe.each([
    ["readline 'close' (Ctrl+D / stream end)", () => rl.emit("close")],
    ["SIGINT (Ctrl+C)", () => addedSigintListeners()[0]!("SIGINT")],
  ])("on %s", (_label, trigger) => {
    beforeEach(() => {
      launchRuntime(session);
      logSpy.mockClear();
    });

    it("marks the session ENDED with an end timestamp", async () => {
      trigger();
      await vi.waitFor(() => expect(exitSpy).toHaveBeenCalled());

      expect(m.saveToTable).toHaveBeenCalledWith("sessions", {
        session_id: "s-1",
        ended_at: NOW_ISO,
        status: SessionStatus.ENDED,
      });
    });

    it("says bye and exits with code 0 after the session is saved", async () => {
      trigger();
      await vi.waitFor(() => expect(exitSpy).toHaveBeenCalledWith(0));

      expect(loggedText()).toContain("bye.");
      expect(m.saveToTable.mock.invocationCallOrder[0]!).toBeLessThan(
        exitSpy.mock.invocationCallOrder[0]!,
      );
    });

    it("still exits cleanly, logging the error, when saving the session fails", async () => {
      const failure = new Error("disk full");
      m.saveToTable.mockRejectedValue(failure);

      trigger();
      await vi.waitFor(() => expect(exitSpy).toHaveBeenCalledWith(0));

      expect(errorSpy).toHaveBeenCalledWith("failed to end session:", failure);
    });
  });

  it("registers exactly one SIGINT listener per launch", () => {
    launchRuntime(session);

    expect(addedSigintListeners()).toHaveLength(1);
  });
});