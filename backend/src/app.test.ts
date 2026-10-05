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

describe("validation des corps (routes events)", () => {
  it("PUT sur un id inconnu renvoie 404 même si le corps est invalide", async () => {
    const res = await request(app).put("/api/events/inconnu").send({ title: "" });
    expect(res.status).toBe(404);
  });

  it("POST avec un tableau comme corps renvoie 400 avec une erreur explicite", async () => {
    const res = await request(app).post("/api/events").send([{ title: "x" }]);
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(["Le corps de la requête doit être un objet JSON."]);
  });

  it("POST avec start numérique renvoie 400", async () => {
    const res = await request(app)
      .post("/api/events")
      .send({ title: "x", start: 0, end: "2030-01-01T11:00:00" });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(['Le champ "start" doit être une date ISO valide.']);
  });
});

describe("export / import iCal (routes events)", () => {
  const ICS_TWO_EVENTS = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "UID:a",
    "DTSTAMP:20260101T000000Z",
    "DTSTART:20300101T100000Z",
    "DTEND:20300101T110000Z",
    "SUMMARY:Importé A",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:b",
    "DTSTAMP:20260101T000000Z",
    "DTSTART;VALUE=DATE:20300102",
    "DTEND;VALUE=DATE:20300103",
    "SUMMARY:Importé B",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  it("GET /api/events/export renvoie un fichier .ics téléchargeable", async () => {
    await request(app)
      .post("/api/events")
      .send({ title: "Exporté", start: "2030-01-01T10:00:00.000Z", end: "2030-01-01T11:00:00.000Z" });

    const res = await request(app).get("/api/events/export");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/^text\/calendar/);
    expect(res.headers["content-disposition"]).toBe('attachment; filename="agenda.ics"');
    expect(res.text).toContain("BEGIN:VCALENDAR");
    expect(res.text).toContain("SUMMARY:Exporté");
  });

  it("POST /api/events/import crée tous les événements d'un fichier valide", async () => {
    const res = await request(app)
      .post("/api/events/import")
      .set("Content-Type", "text/calendar")
      .send(ICS_TWO_EVENTS);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ imported: 2, skipped: 0 });
    const titles = (await request(app).get("/api/events")).body.map((e: { title: string }) => e.title);
    expect(titles).toEqual(expect.arrayContaining(["Importé A", "Importé B"]));
  });

  it("POST /api/events/import refuse tout le fichier si un événement est invalide", async () => {
    const invalid = ICS_TWO_EVENTS.replace("SUMMARY:Importé B", "DESCRIPTION:Sans titre");

    const res = await request(app).post("/api/events/import").set("Content-Type", "text/calendar").send(invalid);

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(['Événement 2 : Le champ "title" est requis.']);
    expect((await request(app).get("/api/events")).body).toEqual([]);
  });

  it("POST /api/events/import exige Content-Type text/calendar", async () => {
    const res = await request(app).post("/api/events/import").send({ title: "x" });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(["Content-Type attendu : text/calendar."]);
  });

  it("GET /api/events/export sans événement renvoie un calendrier vide", async () => {
    const res = await request(app).get("/api/events/export");
    expect(res.status).toBe(200);
    expect(res.text).toContain("END:VCALENDAR");
    expect(res.text).not.toContain("BEGIN:VEVENT");
  });

  it("POST /api/events/import refuse un fichier au-delà de 1 Mo", async () => {
    const big = "X".repeat(1024 * 1024 + 1);
    const res = await request(app).post("/api/events/import").set("Content-Type", "text/calendar").send(big);
    expect(res.status).toBe(413);
  });

  it("POST /api/events/import ignore les événements dont l'UID existe déjà", async () => {
    await request(app).post("/api/events/import").set("Content-Type", "text/calendar").send(ICS_TWO_EVENTS);

    const again = await request(app).post("/api/events/import").set("Content-Type", "text/calendar").send(ICS_TWO_EVENTS);

    expect(again.status).toBe(201);
    expect(again.body).toEqual({ imported: 0, skipped: 2 });
    expect((await request(app).get("/api/events")).body).toHaveLength(2);
  });

  it("POST /api/events/import fond un UID répété dans le même fichier", async () => {
    const doubled = ICS_TWO_EVENTS.replace("UID:b", "UID:a");

    // node-ical ne garde qu'un VEVENT par UID : le doublon est déjà fondu au parsing.
    const res = await request(app).post("/api/events/import").set("Content-Type", "text/calendar").send(doubled);

    expect(res.body).toEqual({ imported: 1, skipped: 0 });
  });

  it("un événement exporté puis réimporté n'est pas dupliqué", async () => {
    await request(app)
      .post("/api/events")
      .send({ title: "Aller-retour", start: "2030-01-01T10:00:00.000Z", end: "2030-01-01T11:00:00.000Z" });
    const exported = (await request(app).get("/api/events/export")).text;

    const res = await request(app).post("/api/events/import").set("Content-Type", "text/calendar").send(exported);

    expect(res.body).toEqual({ imported: 0, skipped: 1 });
    expect((await request(app).get("/api/events")).body).toHaveLength(1);
  });

  describe("filtre par catégorie : GET /api/events?category=", () => {
    const seed = async () => {
      await request(app).post("/api/events").send({ title: "Travail A", start: "2030-01-01T10:00:00.000Z", end: "2030-01-01T11:00:00.000Z", category: "travail" });
      await request(app).post("/api/events").send({ title: "Famille B", start: "2030-01-02T10:00:00.000Z", end: "2030-01-02T11:00:00.000Z", category: "famille" });
      await request(app).post("/api/events").send({ title: "Sans catégorie", start: "2030-01-03T10:00:00.000Z", end: "2030-01-03T11:00:00.000Z" });
    };

    it("ne renvoie que les événements de la catégorie demandée", async () => {
      await seed();
      const res = await request(app).get("/api/events?category=travail");
      expect(res.status).toBe(200);
      expect(res.body.map((e: { title: string }) => e.title)).toEqual(["Travail A"]);
    });

    it("renvoie une liste vide, sans erreur, pour une catégorie sans événement", async () => {
      await seed();
      const res = await request(app).get("/api/events?category=loisirs");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("rattache un événement sans catégorie à autre", async () => {
      await seed();
      const res = await request(app).get("/api/events?category=autre");
      expect(res.body.map((e: { title: string }) => e.title)).toEqual(["Sans catégorie"]);
    });

    it("sans paramètre, renvoie tous les événements dans l'ordre de stockage", async () => {
      await seed();
      const res = await request(app).get("/api/events");
      expect(res.body.map((e: { title: string }) => e.title)).toEqual(["Travail A", "Famille B", "Sans catégorie"]);
    });

    it.each([
      ["une valeur inconnue", "/api/events?category=inconnu"],
      ["une casse différente", "/api/events?category=Travail"],
      ["une chaîne vide", "/api/events?category="],
      ["un paramètre répété", "/api/events?category=travail&category=famille"],
    ])("refuse %s avec 400 et errors[]", async (_label, url) => {
      const res = await request(app).get(url);
      expect(res.status).toBe(400);
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });
});
