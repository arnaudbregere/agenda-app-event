import { Router, type RequestHandler } from "express";
import type { RouteParameters } from "express-serve-static-core";

// Handler dont les paramètres sont déduits du chemin littéral : `get("/:id", h)`
// impose que `h` accepte `{ id: string }`, et `get("/", h)` refuse un handler
// qui attend `req.params.id`. Sans ce helper, Express déduit les paramètres
// depuis le handler et ne vérifie rien contre le chemin.
export type PathHandler<Path extends string> = RequestHandler<RouteParameters<Path>, unknown, unknown>;

export const createTypedRouter = () => {
  const router = Router();

  return {
    router,
    get: <Path extends string>(path: Path, handler: PathHandler<Path>): void => {
      router.get(path, handler);
    },
    post: <Path extends string>(path: Path, handler: PathHandler<Path>): void => {
      router.post(path, handler);
    },
    put: <Path extends string>(path: Path, handler: PathHandler<Path>): void => {
      router.put(path, handler);
    },
    delete: <Path extends string>(path: Path, handler: PathHandler<Path>): void => {
      router.delete(path, handler);
    },
  };
};
