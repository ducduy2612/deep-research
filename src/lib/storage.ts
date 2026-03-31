import localforage from "localforage";
import { z } from "zod";

// Configure localforage for IndexedDB preference
localforage.config({
  name: "deep-research",
  storeName: "app_data",
  description: "Deep Research persistent storage",
});

/**
 * Type-safe storage get with Zod validation.
 * Returns null if key doesn't exist or validation fails.
 */
export async function get<T>(
  key: string,
  schema: z.ZodType<T>
): Promise<T | null> {
  try {
    const raw = await localforage.getItem(key);
    if (raw === null) return null;
    return schema.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Type-safe storage set. Validates value against schema before writing.
 */
export async function set<T>(
  key: string,
  value: T,
  schema: z.ZodType<T>
): Promise<void> {
  const validated = schema.parse(value);
  await localforage.setItem(key, validated);
}

/**
 * Remove a key from storage.
 */
export async function remove(key: string): Promise<void> {
  await localforage.removeItem(key);
}

/**
 * Clear all storage data.
 */
export async function clear(): Promise<void> {
  await localforage.clear();
}

export { localforage };
