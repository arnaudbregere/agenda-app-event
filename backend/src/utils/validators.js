import { CATEGORY_IDS } from "./categories.js";

// Valide le payload d'un événement entrant (POST/PUT).
// `partial` = true pour un PATCH-like update (PUT dans notre cas fait un
// remplacement complet, mais on tolère les mises à jour partielles côté API).
export function validateEvent(body, { partial = false } = {}) {
  const errors = [];

  const required = (field) => {
    if (!partial && (body[field] === undefined || body[field] === null || body[field] === "")) {
      errors.push(`Le champ "${field}" est requis.`);
    }
  };

  required("title");
  required("start");
  required("end");

  if (body.title !== undefined && typeof body.title !== "string") {
    errors.push('Le champ "title" doit être une chaîne de caractères.');
  }
  if (body.title !== undefined && body.title.trim().length === 0) {
    errors.push('Le champ "title" ne peut pas être vide.');
  }
  if (body.title !== undefined && body.title.length > 200) {
    errors.push('Le champ "title" ne doit pas dépasser 200 caractères.');
  }

  if (body.start !== undefined && isNaN(Date.parse(body.start))) {
    errors.push('Le champ "start" doit être une date ISO valide.');
  }
  if (body.end !== undefined && isNaN(Date.parse(body.end))) {
    errors.push('Le champ "end" doit être une date ISO valide.');
  }
  if (
    body.start !== undefined &&
    body.end !== undefined &&
    !isNaN(Date.parse(body.start)) &&
    !isNaN(Date.parse(body.end)) &&
    new Date(body.end) < new Date(body.start)
  ) {
    errors.push('Le champ "end" doit être postérieur ou égal à "start".');
  }

  if (body.allDay !== undefined && typeof body.allDay !== "boolean") {
    errors.push('Le champ "allDay" doit être un booléen.');
  }

  if (body.category !== undefined && !CATEGORY_IDS.includes(body.category)) {
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
