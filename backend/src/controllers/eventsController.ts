import type { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import * as store from "../services/eventsStore.js";
import type { CalendarEvent, EventBody, EventPatch } from "../types.js";
import { eventsToIcs } from "../utils/ical.js";
import { APP_TIMEZONE } from "../utils/timezone.js";

type IdParams = { id: string };

export async function getEvents(req: Request<{}, unknown, unknown>, res: Response<unknown>): Promise<void> {
  const events = await store.listEvents();
  res.json(events);
}

export async function getEventById(req: Request<IdParams, unknown, unknown>, res: Response<unknown>): Promise<void> {
  const event = await store.getEvent(req.params.id);
  if (!event) {
    res.status(404).json({ error: "Événement introuvable." });
    return;
  }
  res.json(event);
}

// Corps validé -> événement persisté (id et horodatage générés ici).
const toCalendarEvent = (body: EventBody, now: string): CalendarEvent => ({
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
});

export async function postEvent(req: Request<{}, unknown, EventBody>, res: Response<unknown>): Promise<void> {
  const created = await store.createEvent(toCalendarEvent(req.body, new Date().toISOString()));
  res.status(201).json(created);
}

export async function exportEvents(req: Request<{}, unknown, unknown>, res: Response<unknown>): Promise<void> {
  const events = await store.listEvents();
  res.attachment("agenda.ics").send(eventsToIcs(events, APP_TIMEZONE));
}

// Tout-ou-rien : le corps est déjà validé par withBody (parseIcsBody).
export async function importEvents(req: Request<{}, unknown, EventBody[]>, res: Response<unknown>): Promise<void> {
  const now = new Date().toISOString();
  const created = await store.createEvents(req.body.map((body) => toCalendarEvent(body, now)));
  res.status(201).json({ imported: created.length });
}

// Précédé par requireEvent (404) puis withBody (validation) dans routes/events.ts.
export async function putEvent(req: Request<IdParams, unknown, EventPatch>, res: Response<unknown>): Promise<void> {
  // Seuls les champs présents dans le corps sont mis à jour : une clé à
  // `undefined` écraserait la valeur existante dans updateEvent (spread).
  const body = req.body;
  const patch: EventPatch = {};
  if (body.title !== undefined) patch.title = body.title.trim();
  if (body.description !== undefined) patch.description = body.description.trim();
  if (body.location !== undefined) patch.location = body.location.trim();
  if (body.start !== undefined) patch.start = body.start.trim();
  if (body.end !== undefined) patch.end = body.end.trim();
  if (body.allDay !== undefined) patch.allDay = body.allDay;
  if (body.category !== undefined) patch.category = body.category;

  const updated = await store.updateEvent(req.params.id, patch);
  if (!updated) {
    // Supprimé entre la pré-vérification et la mise à jour.
    res.status(404).json({ error: "Événement introuvable." });
    return;
  }
  res.json(updated);
}

export async function deleteEventById(req: Request<IdParams, unknown, unknown>, res: Response<unknown>): Promise<void> {
  const deleted = await store.deleteEvent(req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "Événement introuvable." });
    return;
  }
  res.status(204).send();
}
