import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock the DB handle and every entity module (entities use TypeORM decorators;
// the tests only need distinct class identities to verify the table mapping).
// ---------------------------------------------------------------------------
vi.mock("./initDb.js", () => ({ getDb: vi.fn() }));

vi.mock("../database/entities/User.js", () => ({ User: class User {} }));
vi.mock("../database/entities/Device.js", () => ({ Device: class Device {} }));
vi.mock("../database/entities/Workspace.js", () => ({
  Workspace: class Workspace {},
}));
vi.mock("../database/entities/WorkspaceDevice.js", () => ({
  WorkspaceDevice: class WorkspaceDevice {},
}));
vi.mock("../database/entities/Session.js", () => ({
  Session: class Session {},
}));
vi.mock("../database/entities/UserConfigPreferences.js", () => ({
  UserConfigPreferences: class UserConfigPreferences {},
}));
vi.mock("../database/entities/UserSecretsCredentials.js", () => ({
  UserSecretsCredentials: class UserSecretsCredentials {},
}));
vi.mock("../database/entities/Event.js", () => ({ Event: class Event {} }));
vi.mock("../database/entities/Input.js", () => ({ Input: class Input {} }));
vi.mock("../database/entities/Process.js", () => ({
  Process: class Process {},
}));
vi.mock("../database/entities/ProcessOutput.js", () => ({
  ProcessOutput: class ProcessOutput {},
}));
vi.mock("../database/entities/Request.js", () => ({
  Request: class Request {},
}));
vi.mock("../database/entities/AIResponse.js", () => ({
  AIResponse: class AIResponse {},
}));
vi.mock("../database/entities/ActionProposal.js", () => ({
  ActionProposal: class ActionProposal {},
}));

import { getDb } from "./initDb.js";
import {
  saveToTable,
  saveTransaction,
  readTable,
  existsInTable,
  findInTable,
} from "./repo.js";
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


const TABLES: Array<[string, unknown]> = [
  ["users", User],
  ["devices", Device],
  ["workspaces", Workspace],
  ["workspace_devices", WorkspaceDevice],
  ["sessions", Session],
  ["user_config_preferences", UserConfigPreferences],
  ["user_secrets_credentials", UserSecretsCredentials],
  ["events", Event],
  ["inputs", Input],
  ["processes", Process],
  ["process_outputs", ProcessOutput],
  ["requests", Request],
  ["ai_responses", AIResponse],
  ["action_proposals", ActionProposal],
];

// Names that are NOT tables - including keys inherited from Object.prototype,
// which a naive `entityMap[name]` lookup would wrongly accept.
const INVALID_TABLES = [
  "nope",
  "",
  "User",
  "USERS",
  " users",
  "toString",
  "constructor",
  "hasOwnProperty",
  "__proto__",
];

const repository = {
  save: vi.fn(),
  findOne: vi.fn(),
  exists: vi.fn(),
};
const getRepository = vi.fn();

// Transaction handles: `transaction` runs the callback with a fake entity
// manager whose repository is `txRepository` (separate from the plain
// `repository`, so tests can prove writes go through the transaction).
const txRepository = { save: vi.fn() };
const txGetRepository = vi.fn();
const transaction = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  getRepository.mockReturnValue(repository);
  txGetRepository.mockReturnValue(txRepository);
  transaction.mockImplementation(async (callback: (manager: any) => unknown) =>
    callback({ getRepository: txGetRepository }),
  );
  vi.mocked(getDb).mockReturnValue({ getRepository, transaction } as any);
});


describe("saveToTable", () => {
  it.each(TABLES)("maps '%s' to its entity and saves the payload", async (table, entity) => {
    const payload = { some: "data" };
    repository.save.mockResolvedValue({ ...payload, id: 1 });

    const result = await saveToTable(table, payload);

    expect(getRepository).toHaveBeenCalledWith(entity);
    expect(repository.save).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ some: "data", id: 1 });
  });

  it("passes the payload through untouched (same reference)", async () => {
    const payload = { session_id: "s1", status: "ENDED" };
    repository.save.mockResolvedValue(payload);

    await saveToTable("sessions", payload);

    expect(repository.save.mock.calls[0]![0]).toBe(payload);
  });

  it("returns exactly what the repository returns", async () => {
    const saved = { user_id: "u1" };
    repository.save.mockResolvedValue(saved);

    await expect(saveToTable("users", {})).resolves.toBe(saved);
  });

  it("propagates repository errors", async () => {
    const failure = new Error("UNIQUE constraint failed");
    repository.save.mockRejectedValue(failure);

    await expect(saveToTable("users", {})).rejects.toBe(failure);
  });

  it("propagates errors thrown while obtaining the DB (e.g. not initialised)", async () => {
    vi.mocked(getDb).mockImplementation(() => {
      throw new Error("DB not initialised");
    });

    await expect(saveToTable("users", {})).rejects.toThrow("DB not initialised");
  });
});



describe("saveTransaction", () => {
  it.each(TABLES)(
    "maps '%s' to its entity and saves the payload",
    async (table, entity) => {
      const payload = { some: "data" };
      txRepository.save.mockResolvedValue({ ...payload, id: 1 });

      const result = await saveTransaction([{ table, data: payload }]);

      expect(txGetRepository).toHaveBeenCalledWith(entity);
      expect(txRepository.save).toHaveBeenCalledWith(payload);
      expect(result).toEqual([{ some: "data", id: 1 }]);
    },
  );

  it("runs all writes inside a single db.transaction", async () => {
    txRepository.save.mockResolvedValue({});

    await saveTransaction([
      { table: "users", data: {} },
      { table: "devices", data: {} },
    ]);

    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("saves through the transaction's manager, never the plain repository", async () => {
    txRepository.save.mockResolvedValue({});

    await saveTransaction([
      { table: "users", data: {} },
      { table: "devices", data: {} },
    ]);

    expect(txGetRepository).toHaveBeenCalledTimes(2);
    expect(getRepository).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("passes plain-object payloads through untouched (same reference)", async () => {
    const payload = { workspace_name: "my-app" };
    txRepository.save.mockResolvedValue(payload);

    await saveTransaction([{ table: "workspaces", data: payload }]);

    expect(txRepository.save.mock.calls[0]![0]).toBe(payload);
  });

  it("saves the writes in the order given", async () => {
    txRepository.save.mockResolvedValue({});

    await saveTransaction([
      { table: "users", data: { n: 1 } },
      { table: "devices", data: { n: 2 } },
      { table: "sessions", data: { n: 3 } },
    ]);

    expect(txGetRepository.mock.calls.map((call) => call[0])).toEqual([
      User,
      Device,
      Session,
    ]);
    expect(txRepository.save.mock.calls.map((call) => call[0])).toEqual([
      { n: 1 },
      { n: 2 },
      { n: 3 },
    ]);
  });

  it("returns the saved rows in the same order as the writes", async () => {
    const savedUser = { user_id: "u1" };
    const savedDevice = { device_id: "d1" };
    txRepository.save
      .mockResolvedValueOnce(savedUser)
      .mockResolvedValueOnce(savedDevice);

    const result = await saveTransaction([
      { table: "users", data: {} },
      { table: "devices", data: {} },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(savedUser);
    expect(result[1]).toBe(savedDevice);
  });

  it("returns an empty array and saves nothing for an empty list", async () => {
    await expect(saveTransaction([])).resolves.toEqual([]);

    expect(txRepository.save).not.toHaveBeenCalled();
  });

  describe("data as a function", () => {
    it("calls it with the rows saved so far (empty for the first write)", async () => {
      const snapshots: unknown[][] = [];
      const first = vi.fn((previous: any[]) => {
        snapshots.push([...previous]);
        return { n: 1 };
      });
      const second = vi.fn((previous: any[]) => {
        snapshots.push([...previous]);
        return { n: 2 };
      });
      const third = vi.fn((previous: any[]) => {
        snapshots.push([...previous]);
        return { n: 3 };
      });
      txRepository.save
        .mockResolvedValueOnce({ id: "a" })
        .mockResolvedValueOnce({ id: "b" })
        .mockResolvedValueOnce({ id: "c" });

      await saveTransaction([
        { table: "users", data: first },
        { table: "devices", data: second },
        { table: "sessions", data: third },
      ]);

      expect(snapshots).toEqual([[], [{ id: "a" }], [{ id: "a" }, { id: "b" }]]);
    });

    it("saves whatever the function returns", async () => {
      txRepository.save
        .mockResolvedValueOnce({ user_id: "user-1" })
        .mockResolvedValueOnce({ device_id: "dev-1" });

      await saveTransaction([
        { table: "users", data: { username: "Ada" } },
        {
          table: "devices",
          data: ([user]: any[]) => ({ device_name: "box", owner_id: user.user_id }),
        },
      ]);

      expect(txRepository.save).toHaveBeenNthCalledWith(2, {
        device_name: "box",
        owner_id: "user-1",
      });
    });

    it("can mix plain objects and functions in one transaction", async () => {
      txRepository.save
        .mockResolvedValueOnce({ workspace_id: "w1" })
        .mockResolvedValueOnce({ link: true });

      const result = await saveTransaction([
        { table: "workspaces", data: { workspace_name: "my-app" } },
        {
          table: "workspace_devices",
          data: ([workspace]: any[]) => ({
            workspace_id: workspace.workspace_id,
            path: "/work/proj",
          }),
        },
      ]);

      expect(txRepository.save).toHaveBeenNthCalledWith(1, {
        workspace_name: "my-app",
      });
      expect(txRepository.save).toHaveBeenNthCalledWith(2, {
        workspace_id: "w1",
        path: "/work/proj",
      });
      expect(result).toEqual([{ workspace_id: "w1" }, { link: true }]);
    });

    it("does not treat a plain object payload as a function", async () => {
      txRepository.save.mockResolvedValue({});
      const payload = { a: 1 };

      await saveTransaction([{ table: "users", data: payload }]);

      expect(txRepository.save).toHaveBeenCalledWith(payload);
    });
  });

  describe("failures (rollback)", () => {
    it("rejects with the repository error when a save fails", async () => {
      const failure = new Error("UNIQUE constraint failed");
      txRepository.save.mockRejectedValue(failure);

      await expect(
        saveTransaction([{ table: "users", data: {} }]),
      ).rejects.toBe(failure);
    });

    it("stops at the first failing write and never runs the later ones", async () => {
      const failure = new Error("constraint failed");
      txRepository.save
        .mockResolvedValueOnce({ user_id: "u1" })
        .mockRejectedValueOnce(failure);

      await expect(
        saveTransaction([
          { table: "users", data: {} },
          { table: "devices", data: {} },
          { table: "sessions", data: {} },
        ]),
      ).rejects.toBe(failure);

      expect(txRepository.save).toHaveBeenCalledTimes(2);
    });

    it("rejects (so the transaction rolls back) when a data function throws", async () => {
      const failure = new Error("bad payload");
      txRepository.save.mockResolvedValue({ user_id: "u1" });

      await expect(
        saveTransaction([
          { table: "users", data: {} },
          {
            table: "devices",
            data: () => {
              throw failure;
            },
          },
          { table: "sessions", data: {} },
        ]),
      ).rejects.toBe(failure);

      expect(txRepository.save).toHaveBeenCalledTimes(1);
    });

    it("propagates a rejection from db.transaction itself (e.g. commit fails)", async () => {
      const failure = new Error("commit failed");
      transaction.mockRejectedValue(failure);

      await expect(
        saveTransaction([{ table: "users", data: {} }]),
      ).rejects.toBe(failure);
    });

    it("propagates errors thrown while obtaining the DB (e.g. not initialised)", async () => {
      vi.mocked(getDb).mockImplementation(() => {
        throw new Error("DB not initialised");
      });

      await expect(
        saveTransaction([{ table: "users", data: {} }]),
      ).rejects.toThrow("DB not initialised");
    });
  });

  describe("table validation", () => {
    it("rejects an invalid table anywhere in the list, before opening a transaction", async () => {
      await expect(
        saveTransaction([
          { table: "users", data: {} },
          { table: "nope", data: {} },
        ]),
      ).rejects.toThrow("Unknown table: nope");

      expect(getDb).not.toHaveBeenCalled();
      expect(transaction).not.toHaveBeenCalled();
      expect(txRepository.save).not.toHaveBeenCalled();
    });

    it("does not run any data function when a later table is invalid", async () => {
      const data = vi.fn(() => ({}));

      await saveTransaction([
        { table: "users", data },
        { table: "nope", data: {} },
      ]).catch(() => {});

      expect(data).not.toHaveBeenCalled();
    });
  });
});



describe("readTable", () => {
  it.each(TABLES)("maps '%s' to its entity", async (table, entity) => {
    repository.findOne.mockResolvedValue({ id: 1 });

    await readTable(table);

    expect(getRepository).toHaveBeenCalledWith(entity);
  });

  it("fetches the first row with no filter and loads relation ids", async () => {
    repository.findOne.mockResolvedValue({ user_id: "u1" });

    await readTable("users");

    expect(repository.findOne).toHaveBeenCalledWith({
      where: {},
      loadRelationIds: true,
    });
  });

  it("returns the row found", async () => {
    const row = { device_id: "d1", owner: "u1" };
    repository.findOne.mockResolvedValue(row);

    await expect(readTable("devices")).resolves.toBe(row);
  });

  it("returns null (not false) when the table is empty", async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(readTable("users")).resolves.toBeNull();
  });

  it("propagates repository errors", async () => {
    const failure = new Error("no such table");
    repository.findOne.mockRejectedValue(failure);

    await expect(readTable("users")).rejects.toBe(failure);
  });
});


describe("existsInTable", () => {
  it.each(TABLES)("maps '%s' to its entity", async (table, entity) => {
    repository.exists.mockResolvedValue(true);

    await existsInTable(table, { id: 1 });

    expect(getRepository).toHaveBeenCalledWith(entity);
  });

  it("passes the filter as `where`", async () => {
    repository.exists.mockResolvedValue(true);
    const where = { device_id: "d1", path: "/work/proj" };

    await existsInTable("workspace_devices", where);

    expect(repository.exists).toHaveBeenCalledWith({ where });
  });

  it("returns true when a matching row exists", async () => {
    repository.exists.mockResolvedValue(true);

    await expect(existsInTable("users", { user_id: "u1" })).resolves.toBe(true);
  });

  it("returns false when no row matches", async () => {
    repository.exists.mockResolvedValue(false);

    await expect(existsInTable("users", { user_id: "nope" })).resolves.toBe(false);
  });

  it("propagates repository errors", async () => {
    const failure = new Error("query failed");
    repository.exists.mockRejectedValue(failure);

    await expect(existsInTable("users", {})).rejects.toBe(failure);
  });
});


describe("findInTable", () => {
  it.each(TABLES)("maps '%s' to its entity", async (table, entity) => {
    repository.findOne.mockResolvedValue({ id: 1 });

    await findInTable(table, { id: 1 });

    expect(getRepository).toHaveBeenCalledWith(entity);
  });

  it("passes the filter as `where` (without loadRelationIds)", async () => {
    repository.findOne.mockResolvedValue({ workspace_id: "w1" });
    const where = { device_id: "d1", path: "/work/proj" };

    await findInTable("workspace_devices", where);

    expect(repository.findOne).toHaveBeenCalledWith({ where });
  });

  it("returns the matching row", async () => {
    const row = { workspace_id: "w1" };
    repository.findOne.mockResolvedValue(row);

    await expect(findInTable("workspace_devices", {})).resolves.toBe(row);
  });

  it.each([[null], [undefined]])(
    "returns the literal `false` (not %s) when nothing matches",
    async (missing) => {
      repository.findOne.mockResolvedValue(missing);

      await expect(findInTable("workspace_devices", { path: "/x" })).resolves.toBe(
        false,
      );
    },
  );

  it("propagates repository errors", async () => {
    const failure = new Error("query failed");
    repository.findOne.mockRejectedValue(failure);

    await expect(findInTable("users", {})).rejects.toBe(failure);
  });
});

describe("unknown table names", () => {
  const operations: Array<[string, (table: string) => Promise<unknown>]> = [
    ["saveToTable", (t) => saveToTable(t, {})],
    ["saveTransaction", (t) => saveTransaction([{ table: t, data: {} }])],
    ["readTable", (t) => readTable(t)],
    ["existsInTable", (t) => existsInTable(t, {})],
    ["findInTable", (t) => findInTable(t, {})],
  ];

  describe.each(operations)("%s", (_name, run) => {
    it.each(INVALID_TABLES)("rejects %j with 'Unknown table'", async (table) => {
      await expect(run(table)).rejects.toThrow(`Unknown table: ${table}`);
    });

    it("fails before touching the database", async () => {
      await run("nope").catch(() => {});

      expect(getDb).not.toHaveBeenCalled();
      expect(getRepository).not.toHaveBeenCalled();
    });
  });
});