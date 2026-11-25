import type {
  PersistStorage,
  StateStorage,
  StorageValue,
} from "zustand/middleware";
import { parseState } from "./serialization";

const format = "norman-flow-chunks-v1";
const pageLimit = 64 * 1024;
type Reference = { r: number };
type Encoded = null | boolean | number | string | Reference;
type Entry =
  | ["a" | "o", number]
  | ["s", number, string]
  | ["v", number, string | number, Encoded];
type Manifest = {
  format: typeof format;
  generation: string;
  pages: number;
  root: Encoded;
};
const pageKey = (key: string, generation: string, page: number) =>
  `${key}:${generation}:${page}`;
const isManifest = (value: unknown): value is Manifest => {
  const m = value as Partial<Manifest> | null;
  return (
    m?.format === format &&
    typeof m.generation === "string" &&
    Number.isSafeInteger(m.pages) &&
    m.pages! >= 0
  );
};

// Emit small records instead of stringifying the entire Zustand state. References
// preserve shared geometry, raw records and undo data across the whole snapshot.
export function* encodeState(value: unknown): Generator<Entry, Encoded> {
  const seen = new WeakMap<object, number>();
  const pending: { id: number; value: object }[] = [];
  let nextId = 0;
  function* encode(value: unknown): Generator<Entry, Encoded> {
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
      if (value.length <= 4096) return value;
      const id = nextId++;
      for (let offset = 0; offset < value.length; offset += 4096)
        yield ["s", id, value.slice(offset, offset + 4096)];
      return { r: id };
    }
    if (typeof value !== "object") return null;
    const existing = seen.get(value);
    if (existing !== undefined) return { r: existing };
    const id = nextId++;
    seen.set(value, id);
    pending.push({ id, value });
    yield [Array.isArray(value) ? "a" : "o", id];
    return { r: id };
  }
  const root = yield* encode(value);
  for (let index = 0; index < pending.length; index++) {
    const { id, value } = pending[index];
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++)
        yield ["v", id, i, yield* encode(value[i])];
    } else {
      for (const key of Object.keys(value)) {
        const item = (value as Record<string, unknown>)[key];
        if (
          item === undefined ||
          typeof item === "function" ||
          typeof item === "symbol"
        )
          continue;
        yield ["v", id, key, yield* encode(item)];
      }
    }
  }
  return root;
}

function sameSnapshot(
  a: StorageValue<unknown> | undefined,
  b: StorageValue<unknown>,
): boolean {
  if (!a || a.version !== b.version) return false;
  const left = a.state as Record<string, unknown>,
    right = b.state as Record<string, unknown>;
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => Object.is(left[key], right[key]))
  );
}

export function createFlowStorage<S>(
  storage: StateStorage,
  onError: (error: unknown) => void = () => {},
) {
  let tail: Promise<void> = Promise.resolve();
  let lastSnapshot: StorageValue<S> | undefined;
  let sequence = 0;
  async function read(key: string): Promise<StorageValue<S> | null> {
    const raw = await storage.getItem(key);
    if (raw === null) return null;
    const saved: unknown = JSON.parse(raw);
    // Existing single-string snapshots are upgraded on the next successful save.
    if (!isManifest(saved)) return parseState(raw) as StorageValue<S>;
    const nodes = new Map<number, object | string>();
    const resolve = (value: Encoded): unknown => {
      if (value === null || typeof value !== "object") return value;
      if (!nodes.has(value.r))
        throw new Error(
          "Saved data is incomplete. Please import the source files again.",
        );
      return nodes.get(value.r);
    };
    for (let page = 0; page < saved.pages; page++) {
      const rawPage = await storage.getItem(
        pageKey(key, saved.generation, page),
      );
      if (rawPage === null)
        throw new Error(
          "A saved data chunk is missing. Please import the source files again.",
        );
      const entries: Entry[] = JSON.parse(rawPage);
      for (const entry of entries) {
        const [type, id] = entry;
        if (type === "a") nodes.set(id, []);
        else if (type === "o") nodes.set(id, {});
        else if (type === "s") nodes.set(id, (nodes.get(id) ?? "") + entry[2]);
        else if (entry[0] === "v") {
          const target = nodes.get(id);
          if (!target || typeof target !== "object")
            throw new Error("Saved data contains an invalid reference.");
          Object.defineProperty(target, entry[2], {
            value: resolve(entry[3]),
            writable: true,
            enumerable: true,
            configurable: true,
          });
        }
      }
    }
    const restored = resolve(saved.root) as StorageValue<S>;
    lastSnapshot ??= restored;
    return restored;
  }
  async function write(key: string, value: StorageValue<S>) {
    const previousRaw = await storage.getItem(key);
    const previous: unknown =
      previousRaw === null ? null : JSON.parse(previousRaw);
    const generation = `${Date.now().toString(36)}-${(sequence++).toString(36)}-${Math.random().toString(36).slice(2)}`;
    let pages = 0,
      parts: string[] = [],
      size = 2;
    const flushPage = async () => {
      if (!parts.length) return;
      await storage.setItem(
        pageKey(key, generation, pages),
        `[${parts.join(",")}]`,
      );
      pages++;
      parts = [];
      size = 2;
      // Let native UI and other tasks run between storage batches.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };
    try {
      const entries = encodeState(value);
      let entry = entries.next();
      while (!entry.done) {
        const text = JSON.stringify(entry.value);
        if (size + text.length + 1 > pageLimit) await flushPage();
        parts.push(text);
        size += text.length + 1;
        entry = entries.next();
      }
      await flushPage();
      const manifest: Manifest = {
        format,
        generation,
        pages,
        root: entry.value,
      };
      // Publish last: an interrupted write leaves the previous snapshot readable.
      await storage.setItem(key, JSON.stringify(manifest));
    } catch (error) {
      await Promise.all(
        Array.from({ length: pages }, (_, page) =>
          Promise.resolve(
            storage.removeItem(pageKey(key, generation, page)),
          ).catch(() => {}),
        ),
      );
      throw error;
    }
    if (isManifest(previous)) {
      // Cleanup cannot invalidate the newly published snapshot.
      for (let page = 0; page < previous.pages; page++)
        await Promise.resolve(
          storage.removeItem(pageKey(key, previous.generation, page)),
        ).catch(() => {});
    }
  }
  let queued: { key: string; value: StorageValue<S> } | undefined;
  const adapter: PersistStorage<S> & { flush: () => Promise<void> } = {
    getItem: read,
    setItem: (key, value) => {
      // Zustand invokes persistence even for nonpersisted fields such as selected.
      if (sameSnapshot(lastSnapshot, value)) return tail;
      lastSnapshot = value;
      // Rapid updates (a slider drag) replace a write that hasn't started yet,
      // so only the latest snapshot is encoded.
      if (queued?.key === key) {
        queued.value = value;
        return tail;
      }
      const entry = { key, value };
      queued = entry;
      const job = tail
        .catch(() => {})
        .then(() => {
          if (queued === entry) queued = undefined;
          return write(entry.key, entry.value);
        });
      tail = job;
      // Attach a handler even for fire-and-forget store updates. Import explicitly
      // awaits flush() so disk errors can be shown in the import screen.
      void job.catch((error) => {
        onError(error);
      });
      return job;
    },
    removeItem: (key) => {
      lastSnapshot = undefined;
      queued = undefined;
      const job = tail
        .catch(() => {})
        .then(async () => {
          const raw = await storage.getItem(key);
          const saved: unknown = raw === null ? null : JSON.parse(raw);
          await storage.removeItem(key);
          if (isManifest(saved))
            for (let page = 0; page < saved.pages; page++)
              await storage.removeItem(pageKey(key, saved.generation, page));
        });
      tail = job;
      void job.catch(onError);
      return job;
    },
    flush: () => tail,
  };
  return adapter;
}
