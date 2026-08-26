import { v4 as uuidv4 } from "uuid";
import * as store from "../services/eventsStore.js";
import { validateEvent } from "../utils/validators.js";

export async function getEvents(req, res) {
  const events = await store.listEvents();
  res.json(events);
}

export async function getEventById(req, res) {
  const event = await store.getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: "Événement introuvable." });
  res.json(event);
}

export async function postEvent(req, res) {
  const errors = validateEvent(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const now = new Date().toISOString();
  const event = {
    id: uuidv4(),
    title: req.body.title.trim(),
    description: req.body.description?.trim() ?? "",
    location: req.body.location?.trim() ?? "",
    start: req.body.start,
    end: req.body.end,
    allDay: req.body.allDay ?? false,
    category: req.body.category ?? "autre",
    createdAt: now,
    updatedAt: now,
  };

  const created = await store.createEvent(event);
  res.status(201).json(created);
}

export async function putEvent(req, res) {
  const existing = await store.getEvent(req.params.id);
  if (!existing) return res.status(404).json({ error: "Événement introuvable." });

  const errors = validateEvent(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ errors });

  const patch = {};
  for (const field of ["title", "description", "location", "start", "end", "allDay", "category"]) {
    if (req.body[field] !== undefined) {
      patch[field] = typeof req.body[field] === "string" ? req.body[field].trim() : req.body[field];
    }
  }

  const updated = await store.updateEvent(req.params.id, patch);
  res.json(updated);
}

export async function deleteEventById(req, res) {
  const deleted = await store.deleteEvent(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Événement introuvable." });
  res.status(204).send();
}
