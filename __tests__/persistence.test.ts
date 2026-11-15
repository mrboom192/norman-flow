import { expect, it, jest } from "@jest/globals";
import { createFlowStorage } from "../src/store/persistence";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: jest.fn(async (key: string) => data.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      data.delete(key);
    }),
  };
}

it("never stringifies a whole snapshot, preserves references, and restores from bounded chunks", async () => {
  const storage = memoryStorage();
  const adapter = createFlowStorage<{
    files: unknown[];
    results: unknown;
    note: string;
  }>(storage);
  const geometry = Array.from({ length: 20000 }, (_, i) => [
    35 + i / 10000,
    -97,
  ]);
  const segment = { id: "ROAD#1", geometry };
  const snapshot = {
    version: 0,
    state: {
      files: [segment],
      results: { segments: [segment] },
      note: 'α\\"\n'.repeat(30000),
    },
  };
  const stringify = JSON.stringify;
  const spy = jest.spyOn(JSON, "stringify").mockImplementation(((
    value: unknown,
    ...args: unknown[]
  ) => {
    // Reproduce the reported failure if code tries to serialize the whole store.
    if (value === snapshot || value === snapshot.state)
      throw new RangeError("String length exceeds limit");
    return (stringify as (...args: unknown[]) => string)(value, ...args);
  }) as typeof JSON.stringify);
  try {
    await adapter.setItem("state", snapshot);
    const restored = await adapter.getItem("state");
    expect(restored).toEqual(snapshot);
    expect(
      (restored!.state.results as { segments: unknown[] }).segments[0],
    ).toBe(restored!.state.files[0]);
    expect(storage.data.size).toBeGreaterThan(2);
    expect(
      Math.max(...[...storage.data.values()].map((value) => value.length)),
    ).toBeLessThanOrEqual(65536);
  } finally {
    spy.mockRestore();
  }
});

it("skips persistence when a map selection leaves persisted fields unchanged", async () => {
  const storage = memoryStorage();
  const adapter = createFlowStorage<{ files: unknown[]; ward: number }>(
    storage,
  );
  const state = { files: [], ward: 1 };
  await adapter.setItem("state", { version: 0, state });
  const writes = storage.setItem.mock.calls.length;
  await adapter.setItem("state", { version: 0, state: { ...state } });
  expect(storage.setItem).toHaveBeenCalledTimes(writes);
  await adapter.setItem("state", { version: 0, state: { ...state, ward: 2 } });
  expect((await adapter.getItem("state"))!.state.ward).toBe(2);
});

it("retains the previous snapshot after a write failure and reports it without a save loop", async () => {
  const storage = memoryStorage();
  const error = jest.fn();
  const adapter = createFlowStorage<{ ward: number }>(storage, error);
  await adapter.setItem("state", { state: { ward: 1 }, version: 0 });
  const failed = { state: { ward: 2 }, version: 0 };
  storage.setItem.mockRejectedValueOnce(new Error("Storage is full"));
  await expect(adapter.setItem("state", failed)).rejects.toThrow(
    "Storage is full",
  );
  await expect(adapter.flush()).rejects.toThrow("Storage is full");
  expect((await adapter.getItem("state"))!.state.ward).toBe(1);
  expect(error).toHaveBeenCalledTimes(1);
  await expect(
    adapter.setItem("state", { ...failed, state: { ...failed.state } }),
  ).rejects.toThrow();
  expect(error).toHaveBeenCalledTimes(1);
  await adapter.setItem("state", { state: { ward: 3 }, version: 0 });
  expect((await adapter.getItem("state"))!.state.ward).toBe(3);
});

it("loads legacy snapshots and serializes concurrent updates in order", async () => {
  const storage = memoryStorage();
  storage.data.set("state", JSON.stringify({ state: { ward: 1 }, version: 0 }));
  const adapter = createFlowStorage<{ ward: number }>(storage);
  expect((await adapter.getItem("state"))!.state.ward).toBe(1);
  const first = adapter.setItem("state", { state: { ward: 2 }, version: 0 });
  const second = adapter.setItem("state", { state: { ward: 3 }, version: 0 });
  await Promise.all([first, second]);
  expect((await adapter.getItem("state"))!.state.ward).toBe(3);
  const manifest = JSON.parse(storage.data.get("state")!);
  expect(storage.data.size).toBe(manifest.pages + 1);
});
