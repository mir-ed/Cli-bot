import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const m = vi.hoisted(() => ({
  initialiseIfNeeded: vi.fn(),
  resolveWorkspace: vi.fn(),
  createSession: vi.fn(),
  launchRuntime: vi.fn(),
}));

vi.mock("./bootstrapTools.js", () => ({
  initialiseIfNeeded: m.initialiseIfNeeded,
  resolveWorkspace: m.resolveWorkspace,
  createSession: m.createSession,
  launchRuntime: m.launchRuntime,
}));

import { init } from "./orchestrator.js";

const ANSI = /\u001b\[[0-9;]*m/g;
const strip = (value: unknown): string => String(value).replace(ANSI, "");

const userInfo = {
  user: { user_id: "u1" },
  device: { device_id: "d1" },
  workspacePath: "/work/proj",
};
const wd = { workspace_id: "w1", device_id: "d1", path: "/work/proj" };
const session = { session_id: "s1" };

let errorSpy: ReturnType<typeof vi.spyOn>;
let exitSpy: ReturnType<typeof vi.spyOn>;

function arrangeSuccess() {
  m.initialiseIfNeeded.mockResolvedValue(userInfo);
  m.resolveWorkspace.mockResolvedValue(wd);
  m.createSession.mockResolvedValue(session);
  m.launchRuntime.mockReturnValue(undefined);
}

beforeEach(() => {
  vi.resetAllMocks();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  exitSpy = vi
    .spyOn(process, "exit")
    .mockImplementation((() => undefined) as never);
  arrangeSuccess();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("init", () => {
  describe("happy path", () => {
    it("returns the user info, workspace-device link and session", async () => {
      await expect(init()).resolves.toEqual({ userInfo, wd, session });
    });

    it("passes each step's output to the next step", async () => {
      await init();

      expect(m.resolveWorkspace).toHaveBeenCalledWith(userInfo);
      expect(m.createSession).toHaveBeenCalledWith(wd);
      expect(m.launchRuntime).toHaveBeenCalledWith(session);
    });

    it("runs the steps in order: init -> workspace -> session -> runtime", async () => {
      await init();

      const order = [
        m.initialiseIfNeeded,
        m.resolveWorkspace,
        m.createSession,
        m.launchRuntime,
      ].map((fn) => fn.mock.invocationCallOrder[0]!);

      expect(order).toEqual([...order].sort((a, b) => a - b));
    });

    it("calls each step exactly once", async () => {
      await init();

      expect(m.initialiseIfNeeded).toHaveBeenCalledTimes(1);
      expect(m.resolveWorkspace).toHaveBeenCalledTimes(1);
      expect(m.createSession).toHaveBeenCalledTimes(1);
      expect(m.launchRuntime).toHaveBeenCalledTimes(1);
    });

    it("does not log an error or exit", async () => {
      await init();

      expect(errorSpy).not.toHaveBeenCalled();
      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe("failure handling", () => {
    const stages = [
      {
        name: "initialiseIfNeeded",
        fail: (e: unknown) => m.initialiseIfNeeded.mockRejectedValue(e),
        notCalled: ["resolveWorkspace", "createSession", "launchRuntime"],
      },
      {
        name: "resolveWorkspace",
        fail: (e: unknown) => m.resolveWorkspace.mockRejectedValue(e),
        notCalled: ["createSession", "launchRuntime"],
      },
      {
        name: "createSession",
        fail: (e: unknown) => m.createSession.mockRejectedValue(e),
        notCalled: ["launchRuntime"],
      },
      {
        name: "launchRuntime",
        fail: (e: unknown) =>
          m.launchRuntime.mockImplementation(() => {
            throw e;
          }),
        notCalled: [],
      },
    ] as const;

    describe.each(stages)("when $name fails", ({ fail, notCalled }) => {
      it("prints a red 'Failed to start cli-bot' message with the error message", async () => {
        fail(new Error("kaboom"));

        await init();

        expect(errorSpy).toHaveBeenCalledTimes(1);
        const [label, detail] = errorSpy.mock.calls[0]!;
        expect(strip(label)).toBe("Failed to start cli-bot:");
        expect(detail).toBe("kaboom");
      });

      it("exits the process with code 1, exactly once", async () => {
        fail(new Error("kaboom"));

        await init();

        expect(exitSpy).toHaveBeenCalledTimes(1);
        expect(exitSpy).toHaveBeenCalledWith(1);
      });

      it("does not return a partial result", async () => {
        fail(new Error("kaboom"));

        await expect(init()).resolves.toBeUndefined();
      });

      it("does not run any later step", async () => {
        fail(new Error("kaboom"));

        await init();

        const handles: Record<string, ReturnType<typeof vi.fn>> = {
          resolveWorkspace: m.resolveWorkspace,
          createSession: m.createSession,
          launchRuntime: m.launchRuntime,
        };
        for (const name of notCalled) {
          expect(handles[name]).not.toHaveBeenCalled();
        }
      });
    });

    it("prints a non-Error rejection value as-is", async () => {
      m.initialiseIfNeeded.mockRejectedValue("plain string failure");

      await init();

      expect(errorSpy.mock.calls[0]![1]).toBe("plain string failure");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("prints only the message of wrapped errors (not the cause)", async () => {
      const wrapped = new Error("Failed to initialize DB: Error: db down", {
        cause: new Error("db down"),
      });
      m.initialiseIfNeeded.mockRejectedValue(wrapped);

      await init();

      expect(errorSpy.mock.calls[0]![1]).toBe(
        "Failed to initialize DB: Error: db down",
      );
    });
  });
});