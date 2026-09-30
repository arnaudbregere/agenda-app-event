import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { existsSync } from "node:fs";
import { FRONTEND_DIST } from "./utils/paths.js";

// Tests d'intégration : montent l'app Express réelle (src/app.ts) et
// vérifient le cycle complet d'une requête HTTP à travers
// routes/ -> controllers/ -> services/, contrairement aux tests unitaires
// de eventsStore.test.ts et validators.test.ts qui testent chaque couche
// isolément.
//
// eventsStore lit/écrit un vrai fichier JSON sur disque : on mocke
// node:fs/promises en mémoire (même technique que eventsStore.test.ts) pour
// ne jamais toucher backend/data/events.json pendant ces tests.
const fsState: { content: string | null } = { content: null };

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(async () => {
    if (fsState.content === null) {
      const err = new Error("ENOENT") as NodeJS.ErrnoException;
      err.code = "ENOENT";
      throw err;
    }
    return fsState.content;
  }),
  writeFile: vi.fn(async (_path: unknown, data: string) => {
    fsState.content = data;
  }),
  mkdir: vi.fn(async () => {}),
}));

const { app } = await import("./app.js");

beforeEach(() => {
  fsState.content = JSON.stringify([]);
});

describe("GET /api/health", () => {
  it("répond ok avec le commit courant", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body).toHaveProperty("commit");
  });
});

describe("GET /api/categories", () => {
  it("retourne les 6 catégories fixes", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(6);
    expect(res.body.map((c: { id: string }) => c.id)).toContain("travail");
  });
});

describe("cycle CRUD complet sur /api/events", () => {
  it("liste vide -> création -> lecture -> modification -> suppression -> 404", async () => {
    expect((await request(app).get("/api/events")).body).toEqual([]);

    const created = await request(app)
      .post("/api/events")
      .send({ title: "  Réunion  ", start: "2030-01-01T10:00:00", end: "2030-01-01T11:00:00" });
    expect(created.status).toBe(201);
    expect(created.body.title).toBe("Réunion"); // trim() côté controller
    expect(created.body.category).toBe("autre"); // valeur par défaut
    const id = created.body.id;

    const fetched = await request(app).get(`/api/events/${id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.id).toBe(id);

    expect((await request(app).get("/api/events")).body).toHaveLength(1);

    const updated = await request(app).put(`/api/events/${id}`).send({ title: "Modifié" });
    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe("Modifié");
    expect(updated.body.updatedAt > updated.body.createdAt).toBe(true);

    expect((await request(app).delete(`/api/events/${id}`)).status).toBe(204);
    expect((await request(app).get(`/api/events/${id}`)).status).toBe(404);
  });
});

describe("validation (400)", () => {
  it.each([
    ["titre manquant", {}],
    ["end antérieur à start", { title: "x", start: "2030-01-02", end: "2030-01-01" }],
    ["catégorie inconnue", { title: "x", start: "2030-01-01", end: "2030-01-01", category: "zzz" }],
  ])("%s", async (_label, payload) => {
    const res = await request(app).post("/api/events").send(payload);
    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it("JSON malformé -> 400 via le gestionnaire d'erreurs centralisé", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("content-type", "application/json")
      .send('{"title":');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});

describe("404", () => {
  it("route API inconnue", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Route introuvable." });
  });

  it("PUT et DELETE sur un id inconnu", async () => {
    expect((await request(app).put("/api/events/inconnu").send({ title: "x" })).status).toBe(404);
    expect((await request(app).delete("/api/events/inconnu")).status).toBe(404);
  });
});

describe("fallback SPA", () => {
  // app.ts décide au chargement du module si frontend/dist existe (le job
  // CI "backend" ne le construit jamais, mais en local il peut exister si
  // le frontend a été buildé juste avant) : on vérifie l'état réel plutôt
  // que d'en supposer un, pour ne pas fabriquer ni supprimer de fichiers
  // hors de backend/.
  const frontendBuilt = existsSync(FRONTEND_DIST);

  it(
    frontendBuilt
      ? "route non-API avec build frontend présent -> sert index.html"
      : "route non-API sans build frontend -> 404 JSON (pas de fallback HTML)",
    async () => {
      const res = await request(app).get("/une-route-quelconque");
      if (frontendBuilt) {
        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toContain("text/html");
      } else {
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Route introuvable." });
      }
    },
  );

  it("route /api/* inconnue reste 404 JSON même avec un build frontend présent", async () => {
    const res = await request(app).get("/api/toujours-inconnue");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Route introuvable." });
  });
});
