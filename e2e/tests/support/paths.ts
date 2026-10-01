import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Racine du dossier e2e/ (contient ce fichier sous tests/support/).
const E2E_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Port dédié, différent du 4000 utilisé par `npm run dev` côté backend, pour
// ne jamais entrer en conflit avec un serveur de dev déjà lancé en local.
export const E2E_PORT = process.env.E2E_PORT ?? "4310";
export const BASE_URL = `http://localhost:${E2E_PORT}`;

// Fichier de données dédié à la suite e2e (voir EVENTS_DATA_FILE dans
// backend/src/utils/paths.ts) : jamais backend/data/events.json.
export const EVENTS_DATA_FILE = join(E2E_ROOT, ".tmp", "events.e2e.json");
