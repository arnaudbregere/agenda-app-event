import type { RequestHandler } from "express";
import * as store from "../services/eventsStore.js";
import type { ErrorBody } from "../types.js";

type IdParams = { id: string };

// Pré-vérification d'existence : répond 404 avant que la validation du corps
// ne s'exécute (ordre conservé par rapport à l'API d'origine).
export const requireEvent: RequestHandler<IdParams, ErrorBody, unknown> = async (req, res, next) => {
  const event = await store.getEvent(req.params.id);
  if (!event) {
    res.status(404).json({ error: "Événement introuvable." });
    return;
  }
  next();
};
