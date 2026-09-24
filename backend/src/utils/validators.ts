import { CATEGORY_IDS } from "./categories.js";

// Valide le payload d'un événement entrant (POST/PUT).
// `partial` = true pour un PATCH-like update (PUT dans notre cas fait un
// remplacement complet, mais on tolère les mises à jour partielles côté API).
export type EventPayload = Record<string, unknown>;

// Date.parse et le constructeur Date acceptent des entrées différentes selon le
// type ("123" vs 123) : les deux helpers reproduisent l'appel d'origine tel quel.
const parseTime = (value: unknown): number => Date.parse(String(value));
const toDate = (value: unknown): Date => new Date(value as string | number);

export function validateEvent(body: EventPayload, { partial = false }: { partial?: boolean } = {}): string[] {
  const errors: string[] = [];

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
    if (title.trim().length === 0) {
      errors.push('Le champ "title" ne peut pas être vide.');
    }
    if (title.length > 200) {
      errors.push('Le champ "title" ne doit pas dépasser 200 caractères.');
    }
  }

  if (body.start !== undefined && isNaN(parseTime(body.start))) {
    errors.push('Le champ "start" doit être une date ISO valide.');
  }
  if (body.end !== undefined && isNaN(parseTime(body.end))) {
    errors.push('Le champ "end" doit être une date ISO valide.');
  }
  if (
    body.start !== undefined &&
    body.end !== undefined &&
    !isNaN(parseTime(body.start)) &&
    !isNaN(parseTime(body.end)) &&
    toDate(body.end) < toDate(body.start)
  ) {
    errors.push('Le champ "end" doit être postérieur ou égal à "start".');
  }

  if (body.allDay !== undefined && typeof body.allDay !== "boolean") {
    errors.push('Le champ "allDay" doit être un booléen.');
  }

  if (body.category !== undefined && !(CATEGORY_IDS as readonly unknown[]).includes(body.category)) {
    errors.push(`Le champ "category" doit être l'une des valeurs suivantes : ${CATEGORY_IDS.join(", ")}.`);
  }

  if (body.description !== undefined && typeof body.description !== "string") {
    errors.push('Le champ "description" doit être une chaîne de caractères.');
  }
  if (body.location !== undefined && typeof body.location !== "string") {
    errors.push('Le champ "location" doit être une chaîne de caractères.');
  }

  return errors;
}
