import { describe, it, expect } from "vitest";
import express, { type Request, type Response } from "express";
import request from "supertest";
import { createTypedRouter } from "./typedRouter.js";

// Deux volets :
// - runtime : le router câblé répond comme attendu (supertest, sans port réseau) ;
// - types : `npm run typecheck` compile ce fichier. Chaque `@ts-expect-error`
//   échoue si le compilateur n'élève plus l'erreur de câblage, donc ce test
//   garantit que `createTypedRouter` rejette un mauvais chemin/handler.

type IdParams = { id: string };

const withId = (req: Request<IdParams, unknown, unknown>, res: Response<{ id: string }>): void => {
  res.json({ id: req.params.id });
};

const noParams = (_req: Request<{}, unknown, unknown>, res: Response<{ ok: boolean }>): void => {
  res.json({ ok: true });
};

describe("createTypedRouter", () => {
  it("transmet les paramètres du chemin au handler", async () => {
    const api = createTypedRouter();
    api.get("/:id", withId);
    const app = express();
    app.use("/items", api.router);

    const res = await request(app).get("/items/42");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "42" });
  });

  it("route les verbes HTTP sur leur chemin", async () => {
    const api = createTypedRouter();
    api.get("/", noParams);
    api.post("/", noParams);
    api.put("/:id", withId);
    api.delete("/:id", withId);
    const app = express();
    app.use("/items", api.router);

    expect((await request(app).get("/items")).body).toEqual({ ok: true });
    expect((await request(app).post("/items")).body).toEqual({ ok: true });
    expect((await request(app).put("/items/7")).body).toEqual({ id: "7" });
    expect((await request(app).delete("/items/9")).body).toEqual({ id: "9" });
  });

  it("rejette au typecheck un handler qui attend un paramètre absent du chemin", () => {
    const api = createTypedRouter();
    // @ts-expect-error : withId attend req.params.id, la route "/" n'a pas de :id
    api.get("/", withId);
    expect(api).toBeDefined();
  });

  it("rejette au typecheck un handler à corps typé branché sans withBody", () => {
    const api = createTypedRouter();
    const needsBody = (req: Request<{}, unknown, { title: string }>, res: Response<string>): void => {
      res.json(req.body.title);
    };
    // @ts-expect-error : le corps doit être validé (withBody) avant d'atteindre ce handler
    api.post("/", needsBody);
    expect(api).toBeDefined();
  });

  it("rejette au typecheck un paramètre renommé dans le chemin", () => {
    const api = createTypedRouter();
    // @ts-expect-error : le chemin déclare :foo, withId attend :id
    api.get("/:foo", withId);
    expect(api).toBeDefined();
  });
});
