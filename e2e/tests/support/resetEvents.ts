import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { EVENTS_DATA_FILE } from "./paths.js";

// Réinitialise le stockage events.json de la suite e2e entre les tests pour
// que chaque test parte d'un état connu, sans dépendre de l'ordre d'exécution.
export async function resetEvents(): Promise<void> {
  await mkdir(dirname(EVENTS_DATA_FILE), { recursive: true });
  await writeFile(EVENTS_DATA_FILE, "[]\n", "utf-8");
}
