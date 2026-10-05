import type { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import * as store from "../services/eventsStore.js";
import type { CalendarEvent, EventBody, EventPatch } from "../types.js";
import { parseEventPatch } from "../utils/validators.js";

type IdParams = { id: string };

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

export async function postEvent(req: Request<{}, unknown, EventBody>, res: Response): Promise<void> {
  const body = req.body;
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

export async function putEvent(req: Request<IdParams, unknown, unknown>, res: Response): Promise<void> {
  const existing = await store.getEvent(req.params.id);
  if (!existing) {
    res.status(404).json({ error: "Événement introuvable." });
    return;
  }

  // Validation après la recherche : un id inconnu renvoie 404 même si le corps est invalide.
  const parsed = parseEventPatch(req.body);
  if (!parsed.ok) {
    res.status(400).json({ errors: parsed.errors });
    return;
  }

  // Seuls les champs présents dans le corps sont mis à jour : une clé à
  // `undefined` écraserait la valeur existante dans updateEvent (spread).
  const body = parsed.value;
  const patch: EventPatch = {};
  if (body.title !== undefined) patch.title = body.title.trim();
  if (body.description !== undefined) patch.description = body.description.trim();
  if (body.location !== undefined) patch.location = body.location.trim();
  if (body.start !== undefined) patch.start = body.start.trim();
  if (body.end !== undefined) patch.end = body.end.trim();
  if (body.allDay !== undefined) patch.allDay = body.allDay;
  if (body.category !== undefined) patch.category = body.category;

  const updated = await store.updateEvent(req.params.id, patch);
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
