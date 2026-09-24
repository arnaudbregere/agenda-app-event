import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { DATA_FILE } from "../utils/paths.js";
import type { CalendarEvent, EventPatch } from "../types.js";

// Toutes les lectures/écritures passent par cette file de promesses pour
// éviter que deux requêtes concurrentes n'écrasent le fichier JSON l'une
// l'autre (pas de vraie transaction possible avec un simple fichier).
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.catch(() => {});
  return result;
}

async function readAll(): Promise<CalendarEvent[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      await mkdir(dirname(DATA_FILE), { recursive: true });
      await writeFile(DATA_FILE, "[]\n", "utf-8");
      return [];
    }
    throw err;
  }
}

async function writeAll(events: CalendarEvent[]): Promise<void> {
  await writeFile(DATA_FILE, JSON.stringify(events, null, 2) + "\n", "utf-8");
}

export function listEvents(): Promise<CalendarEvent[]> {
  return enqueue(() => readAll());
}

export async function getEvent(id: string): Promise<CalendarEvent | null> {
  const events = await enqueue(() => readAll());
  return events.find((e) => e.id === id) ?? null;
}

export function createEvent(event: CalendarEvent): Promise<CalendarEvent> {
  return enqueue(async () => {
    const events = await readAll();
    events.push(event);
    await writeAll(events);
    return event;
  });
}

export function updateEvent(id: string, patch: EventPatch): Promise<CalendarEvent | null> {
  return enqueue(async () => {
    const events = await readAll();
    const index = events.findIndex((e) => e.id === id);
    if (index === -1) return null;
    const updated = { ...events[index], ...patch, id, updatedAt: new Date().toISOString() };
    events[index] = updated;
    await writeAll(events);
    return updated;
  });
}

export function deleteEvent(id: string): Promise<boolean> {
  return enqueue(async () => {
    const events = await readAll();
    const index = events.findIndex((e) => e.id === id);
    if (index === -1) return false;
    events.splice(index, 1);
    await writeAll(events);
    return true;
  });
}
