import { CATEGORY_IDS, type CategoryId } from "./categories.js";
import {
  MAX_RECURRENCE_INTERVAL,
  MIN_RECURRENCE_INTERVAL,
  RECURRENCE_FREQS,
  type EventBody,
  type EventPatchBody,
  type RecurrenceRule,
} from "../types.js";

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
  // `null` = demande explicite de retrait (voir EventBody dans ../types.ts).
  recurrence?: RecurrenceRule | null;
  exdates?: string[] | null;
  recurrenceParentId?: string;
  recurrenceId?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseTime = (value: string): number => Date.parse(value);

const isIsoDate = (value: unknown): value is string =>
  typeof value === "string" && !isNaN(parseTime(value));

// Valide la règle de répétition. Ne développe aucune occurrence et ne les compte
// pas : le plafond est une borne d'affichage du frontend, pas une règle de donnée
// (specs/002-recurring-events/research.md, R-005). Garder ce fichier exempt de
// tout calcul de date de récurrence.
const readRecurrence = (raw: unknown, errors: string[]): RecurrenceRule | undefined => {
  if (!isRecord(raw)) {
    errors.push('Le champ "recurrence" doit être un objet.');
    return undefined;
  }

  const freq = RECURRENCE_FREQS.find((value) => value === raw.freq);
  if (freq === undefined) {
    errors.push(`Le champ "recurrence.freq" doit être l'une des valeurs suivantes : ${RECURRENCE_FREQS.join(", ")}.`);
  }

  let interval: number | undefined;
  if (typeof raw.interval !== "number" || !Number.isInteger(raw.interval)) {
    errors.push('Le champ "recurrence.interval" doit être un entier.');
  } else if (raw.interval < MIN_RECURRENCE_INTERVAL || raw.interval > MAX_RECURRENCE_INTERVAL) {
    errors.push(
      `Le champ "recurrence.interval" doit être compris entre ${MIN_RECURRENCE_INTERVAL} et ${MAX_RECURRENCE_INTERVAL}.`
    );
  } else {
    interval = raw.interval;
  }

  let until: string | undefined;
  if (raw.until === undefined || raw.until === null || raw.until === "") {
    errors.push('Le champ "recurrence.until" est requis.');
  } else if (!isIsoDate(raw.until)) {
    errors.push('Le champ "recurrence.until" doit être une date ISO valide.');
  } else {
    until = raw.until;
  }

  if (freq === undefined || interval === undefined || until === undefined) {
    return undefined;
  }
  return { freq, interval, until };
};

// Dates d'occurrences exclues. Seul le format est vérifié : une exclusion qui ne
// correspond à aucune occurrence réelle est acceptée et n'exclut rien (R-006).
// Le vérifier exigerait de développer la série ici, donc de dupliquer le calcul
// de dates du frontend.
const readExdates = (raw: unknown, errors: string[]): string[] | undefined => {
  if (!Array.isArray(raw)) {
    errors.push('Le champ "exdates" doit être un tableau de dates ISO.');
    return undefined;
  }
  const dates: string[] = [];
  for (const value of raw) {
    if (!isIsoDate(value)) {
      errors.push('Le champ "exdates" ne doit contenir que des dates ISO valides.');
      return undefined;
    }
    dates.push(value);
  }
  return dates;
};

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

  if (body.recurrence === null) {
    fields.recurrence = null;
  } else if (body.recurrence !== undefined) {
    // `requireEvent` ne met pas l'événement chargé à disposition de la validation :
    // sans `start` dans le même corps, `until >= start` serait invérifiable sur une
    // mise à jour partielle. Exiger `start` ferme le trou sans toucher au middleware
    // ni au routeur typé (specs/002-recurring-events/data-model.md).
    if (body.start === undefined || body.start === null || body.start === "") {
      errors.push('Le champ "start" est requis lorsque "recurrence" est fourni.');
    }
    const recurrence = readRecurrence(body.recurrence, errors);
    if (recurrence !== undefined) {
      fields.recurrence = recurrence;
      if (fields.start !== undefined && parseTime(recurrence.until) < parseTime(fields.start)) {
        errors.push('Le champ "recurrence.until" doit être postérieur ou égal à "start".');
      }
    }
  }

  if (body.exdates === null) {
    fields.exdates = null;
  } else if (body.exdates !== undefined) {
    const exdates = readExdates(body.exdates, errors);
    if (exdates !== undefined) {
      fields.exdates = exdates;
    }
  }

  for (const field of ["recurrenceParentId", "recurrenceId"] as const) {
    if (body[field] !== undefined && body[field] !== null) {
      if (typeof body[field] !== "string" || body[field] === "") {
        errors.push(`Le champ "${field}" doit être une chaîne de caractères non vide.`);
      } else {
        fields[field] = body[field];
      }
    }
  }

  // Un enregistrement est soit une série, soit une occurrence surchargée, jamais
  // les deux : une surcharge porteuse d'une règle se développerait à son tour et
  // doublerait l'affichage de sa propre date (invariant INV-3).
  if (fields.recurrence != null && fields.recurrenceParentId !== undefined) {
    errors.push('Les champs "recurrence" et "recurrenceParentId" ne peuvent pas être fournis ensemble.');
  }

  return { errors, fields };
};

// Paramètre de filtre de GET /api/events : `?category=<id>` ou absent.
export type CategoryQuery = { category?: CategoryId };

// Valeurs admises : exactement CATEGORY_IDS, sans normalisation (casse et vide refusés).
export const parseCategoryQuery = (query: unknown): ParseResult<CategoryQuery> => {
  const raw = isRecord(query) ? query.category : undefined;
  if (raw === undefined) {
    return { ok: true, value: {} };
  }
  if (Array.isArray(raw)) {
    return { ok: false, errors: ['Le paramètre "category" ne peut être fourni qu\'une seule fois.'] };
  }
  const category = CATEGORY_IDS.find((id) => id === raw);
  if (category === undefined) {
    return {
      ok: false,
      errors: [`Le paramètre "category" doit être l'une des valeurs suivantes : ${CATEGORY_IDS.join(", ")}.`],
    };
  }
  return { ok: true, value: { category } };
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
export const parseEventPatch = (body: unknown): ParseResult<EventPatchBody> => {
  const { errors, fields } = readFields(body, true);
  if (errors.length) {
    return { ok: false, errors };
  }
  return { ok: true, value: fields };
};
