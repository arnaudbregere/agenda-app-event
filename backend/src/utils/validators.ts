import { CATEGORY_IDS, type CategoryId } from "./categories.js";
import type { EventBody, EventPatch } from "../types.js";

// Résultat d'une validation : soit le corps typé, soit les erreurs.
export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

// Champs lus dans le corps, avant de savoir s'ils sont requis (création) ou non (mise à jour).
type Fields = {
  title?: string;
  description?: string;
  location?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
  category?: CategoryId;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseTime = (value: string): number => Date.parse(value);

// Vérifie chaque champ et renvoie les erreurs ainsi que les champs lus par narrowing.
// `partial` = true pour une mise à jour (PUT) : aucun champ requis.
const readFields = (body: unknown, partial: boolean): { errors: string[]; fields: Fields } => {
  if (!isRecord(body)) {
    return { errors: ["Le corps de la requête doit être un objet JSON."], fields: {} };
  }

  const errors: string[] = [];
  const fields: Fields = {};

  const required = (field: string) => {
    if (!partial && (body[field] === undefined || body[field] === null || body[field] === "")) {
      errors.push(`Le champ "${field}" est requis.`);
    }
  };

  required("title");
  required("start");
  required("end");

  const { title } = body;
  if (title !== undefined && typeof title !== "string") {
    errors.push('Le champ "title" doit être une chaîne de caractères.');
  } else if (typeof title === "string") {
    fields.title = title;
    if (title.trim().length === 0) {
      errors.push('Le champ "title" ne peut pas être vide.');
    }
    if (title.length > 200) {
      errors.push('Le champ "title" ne doit pas dépasser 200 caractères.');
    }
  }

  if (body.start !== undefined && (typeof body.start !== "string" || isNaN(parseTime(body.start)))) {
    errors.push('Le champ "start" doit être une date ISO valide.');
  }
  if (body.end !== undefined && (typeof body.end !== "string" || isNaN(parseTime(body.end)))) {
    errors.push('Le champ "end" doit être une date ISO valide.');
  }
  if (typeof body.start === "string" && !isNaN(parseTime(body.start))) {
    fields.start = body.start;
  }
  if (typeof body.end === "string" && !isNaN(parseTime(body.end))) {
    fields.end = body.end;
  }
  if (fields.start !== undefined && fields.end !== undefined && parseTime(fields.end) < parseTime(fields.start)) {
    errors.push('Le champ "end" doit être postérieur ou égal à "start".');
  }

  if (body.allDay !== undefined && typeof body.allDay !== "boolean") {
    errors.push('Le champ "allDay" doit être un booléen.');
  } else if (typeof body.allDay === "boolean") {
    fields.allDay = body.allDay;
  }

  if (body.category !== undefined) {
    const category = CATEGORY_IDS.find((id) => id === body.category);
    if (category === undefined) {
      errors.push(`Le champ "category" doit être l'une des valeurs suivantes : ${CATEGORY_IDS.join(", ")}.`);
    } else {
      fields.category = category;
    }
  }

  if (body.description !== undefined && typeof body.description !== "string") {
    errors.push('Le champ "description" doit être une chaîne de caractères.');
  } else if (typeof body.description === "string") {
    fields.description = body.description;
  }
  if (body.location !== undefined && typeof body.location !== "string") {
    errors.push('Le champ "location" doit être une chaîne de caractères.');
  } else if (typeof body.location === "string") {
    fields.location = body.location;
  }

  return { errors, fields };
};

// Corps d'une création : title, start et end doivent être présents et valides.
export const parseEventBody = (body: unknown): ParseResult<EventBody> => {
  const { errors, fields } = readFields(body, false);
  const { title, start, end } = fields;
  if (errors.length || title === undefined || start === undefined || end === undefined) {
    return { ok: false, errors };
  }
  return { ok: true, value: { ...fields, title, start, end } };
};

// Corps d'une mise à jour (PUT) : seuls les champs présents sont validés et renvoyés.
export const parseEventPatch = (body: unknown): ParseResult<EventPatch> => {
  const { errors, fields } = readFields(body, true);
  if (errors.length) {
    return { ok: false, errors };
  }
  return { ok: true, value: fields };
};
