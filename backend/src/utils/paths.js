import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Racine du package backend (dossier contenant package.json). Remontée
// dynamique plutôt qu'un nombre de ".." fixe : le code tourne aussi bien
// depuis les sources (backend/src/...) que depuis le build (backend/dist/src/...).
function findBackendRoot() {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(dir, "package.json"))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error("package.json introuvable (racine backend).");
    dir = parent;
  }
  return dir;
}

export const BACKEND_ROOT = findBackendRoot();
export const DATA_FILE = join(BACKEND_ROOT, "data", "events.json");
export const FRONTEND_DIST = join(BACKEND_ROOT, "..", "frontend", "dist");
