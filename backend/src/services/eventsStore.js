import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DATA_FILE = new URL("../../data/events.json", import.meta.url);

// Toutes les lectures/écritures passent par cette file de promesses pour
// éviter que deux requêtes concurrentes n'écrasent le fichier JSON l'une
// l'autre (pas de vraie transaction possible avec un simple fichier).
let queue = Promise.resolve();

function enqueue(task) {
  const result = queue.then(task, task);
  queue = result.catch(() => {});
  return result;
}

async function readAll() {
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    return raw.trim() ? JSON.parse(raw) : [];
  } catch (err) {
    if (err.code === "ENOENT") {
      await mkdir(dirname(fileURLToPath(DATA_FILE)), { recursive: true });
      await writeFile(DATA_FILE, "[]\n", "utf-8");
      return [];
    }
    throw err;
  }
}

async function writeAll(events) {
  await writeFile(DATA_FILE, JSON.stringify(events, null, 2) + "\n", "utf-8");
}

export function listEvents() {
  return enqueue(() => readAll());
}

export async function getEvent(id) {
  const events = await enqueue(() => readAll());
  return events.find((e) => e.id === id) ?? null;
}

export function createEvent(event) {
  return enqueue(async () => {
    const events = await readAll();
    events.push(event);
    await writeAll(events);
    return event;
  });
}

export function updateEvent(id, patch) {
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

export function deleteEvent(id) {
  return enqueue(async () => {
    const events = await readAll();
    const index = events.findIndex((e) => e.id === id);
    if (index === -1) return false;
    events.splice(index, 1);
    await writeAll(events);
    return true;
  });
}
