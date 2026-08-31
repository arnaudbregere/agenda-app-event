import { describe, it, expect, vi, beforeEach } from "vitest";

// eventsStore.js lit/écrit un vrai fichier JSON sur disque. On mocke
// node:fs/promises avec un petit "fichier" en mémoire pour tester la
// logique métier (CRUD, sérialisation des accès concurrents) sans I/O réel
// ni dépendre d'un chemin de fichier particulier.
const fsState = { content: null }; // null = fichier absent (ENOENT)

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(async () => {
    if (fsState.content === null) {
      const err = new Error("ENOENT");
      err.code = "ENOENT";
      throw err;
    }
    return fsState.content;
  }),
  writeFile: vi.fn(async (_path, data) => {
    fsState.content = data;
  }),
  mkdir: vi.fn(async () => {}),
}));

const { readFile, writeFile, mkdir } = await import("node:fs/promises");
const store = await import("./eventsStore.js");

beforeEach(() => {
  fsState.content = null;
  vi.clearAllMocks();
});

describe("listEvents", () => {
  it("bootstrap un fichier vide ([]) quand il n'existe pas encore", async () => {
    const events = await store.listEvents();
    expect(events).toEqual([]);
    expect(mkdir).toHaveBeenCalled();
    expect(writeFile).toHaveBeenCalledWith(expect.anything(), "[]\n", "utf-8");
  });

  it("parse le contenu existant du fichier", async () => {
    fsState.content = JSON.stringify([{ id: "1", title: "Test" }]);
    const events = await store.listEvents();
    expect(events).toEqual([{ id: "1", title: "Test" }]);
    expect(readFile).toHaveBeenCalled();
  });

  it("traite un fichier vide/blanc comme une liste vide", async () => {
    fsState.content = "   \n";
    const events = await store.listEvents();
    expect(events).toEqual([]);
  });
});

describe("getEvent", () => {
  it("retourne l'événement correspondant à l'id", async () => {
    fsState.content = JSON.stringify([{ id: "a" }, { id: "b" }]);
    expect(await store.getEvent("b")).toEqual({ id: "b" });
  });

  it("retourne null si l'id est inconnu", async () => {
    fsState.content = JSON.stringify([{ id: "a" }]);
    expect(await store.getEvent("inconnu")).toBeNull();
  });
});

describe("createEvent", () => {
  it("ajoute l'événement et persiste le fichier", async () => {
    fsState.content = JSON.stringify([]);
    const event = { id: "1", title: "Nouveau" };

    const created = await store.createEvent(event);

    expect(created).toEqual(event);
    expect(JSON.parse(fsState.content)).toEqual([event]);
  });

  it("sérialise deux créations concurrentes (pas d'écrasement)", async () => {
    fsState.content = JSON.stringify([]);
    const a = { id: "a" };
    const b = { id: "b" };

    await Promise.all([store.createEvent(a), store.createEvent(b)]);

    const persisted = JSON.parse(fsState.content);
    expect(persisted).toHaveLength(2);
    expect(persisted.map((e) => e.id).sort()).toEqual(["a", "b"]);
  });
});

describe("updateEvent", () => {
  it("fusionne le patch et met à jour updatedAt", async () => {
    fsState.content = JSON.stringify([{ id: "1", title: "Ancien", updatedAt: "2020-01-01" }]);

    const updated = await store.updateEvent("1", { title: "Nouveau" });

    expect(updated.title).toBe("Nouveau");
    expect(updated.id).toBe("1");
    expect(updated.updatedAt).not.toBe("2020-01-01");
  });

  it("retourne null si l'id est inconnu", async () => {
    fsState.content = JSON.stringify([]);
    expect(await store.updateEvent("inconnu", { title: "x" })).toBeNull();
  });

  it("ne modifie pas l'id même si le patch en contient un autre", async () => {
    fsState.content = JSON.stringify([{ id: "1", title: "A" }]);
    const updated = await store.updateEvent("1", { id: "autre-id", title: "B" });
    expect(updated.id).toBe("1");
  });
});

describe("deleteEvent", () => {
  it("supprime l'événement et retourne true", async () => {
    fsState.content = JSON.stringify([{ id: "1" }, { id: "2" }]);

    const result = await store.deleteEvent("1");

    expect(result).toBe(true);
    expect(JSON.parse(fsState.content)).toEqual([{ id: "2" }]);
  });

  it("retourne false si l'id est inconnu", async () => {
    fsState.content = JSON.stringify([{ id: "1" }]);
    expect(await store.deleteEvent("inconnu")).toBe(false);
  });
});
