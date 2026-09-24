import type { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import * as store from "../services/eventsStore.js";
import { validateEvent } from "../utils/validators.js";
import type { CategoryId } from "../utils/categories.js";
import type { CalendarEvent, EventPatch } from "../types.js";

type IdParams = { id: string };

// Forme du corps d'une requête POST une fois validateEvent() passé sans erreur.
// validateEvent ne sert pas de type guard : ce cast est la frontière entre le
// JSON non fiable reçu et les types internes.
type ValidatedBody = {
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay?: boolean;
  category?: CategoryId;
};

export async function getEvents(req: Request, res: Response): Promise<void> {
  const events = await store.listEvents();
  res.json(events);
}

export async function getEventById(req: Request<IdParams>, res: Response): Promise<void> {
  const event = await store.getEvent(req.params.id);
  if (!event) {
    res.status(404).json({ error: "Événement introuvable." });
    return;
  }
  res.json(event);
}

export async function postEvent(req: Request, res: Response): Promise<void> {
  const errors = validateEvent(req.body);
  if (errors.length) {
    res.status(400).json({ errors });
    return;
  }

  const body = req.body as ValidatedBody;
  const now = new Date().toISOString();
  const event: CalendarEvent = {
    id: uuidv4(),
    title: body.title.trim(),
    description: body.description?.trim() ?? "",
    location: body.location?.trim() ?? "",
    start: body.start,
    end: body.end,
    allDay: body.allDay ?? false,
    category: body.category ?? "autre",
    createdAt: now,
    updatedAt: now,
  };

  const created = await store.createEvent(event);
  res.status(201).json(created);
}

const PATCH_FIELDS = ["title", "description", "location", "start", "end", "allDay", "category"] as const;

export async function putEvent(req: Request<IdParams>, res: Response): Promise<void> {
  const existing = await store.getEvent(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Événement introuvable." });
    return;
  }

  const errors = validateEvent(req.body, { partial: true });
  if (errors.length) {
    res.status(400).json({ errors });
    return;
  }

  const patch: Record<string, unknown> = {};
  for (const field of PATCH_FIELDS) {
    if (req.body[field] !== undefined) {
      patch[field] = typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
    }
  }

  const updated = await store.updateEvent(req.params.id, patch as EventPatch);
  res.json(updated);
}

export async function deleteEventById(req: Request<IdParams>, res: Response): Promise<void> {
  const deleted = await store.deleteEvent(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "Événement introuvable." });
    return;
  }
  res.status(204).send();
}
