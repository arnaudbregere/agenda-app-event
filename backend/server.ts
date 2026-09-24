import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import eventsRouter from "./src/routes/events.js";
import categoriesRouter from "./src/routes/categories.js";
import { BACKEND_ROOT, FRONTEND_DIST } from "./src/utils/paths.js";

const app = express();
const PORT = process.env.PORT || 4000;

type HttpError = Error & { status?: number };

// RENDER_GIT_COMMIT est définie automatiquement par Render sur chaque
// déploiement. En local (ou si absente), on retombe sur `git rev-parse HEAD`
// pour afficher quand même le commit courant. Résolu une seule fois au
// démarrage plutôt qu'à chaque requête.
function resolveCommit(): string | null {
  if (process.env.RENDER_GIT_COMMIT) return process.env.RENDER_GIT_COMMIT;
  try {
    return execSync("git rev-parse HEAD", { cwd: BACKEND_ROOT }).toString().trim();
  } catch {
    return null;
  }
}
const COMMIT = resolveCommit();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req: Request, res: Response) => res.json({ status: "ok", commit: COMMIT }));
app.use("/api/events", eventsRouter);
app.use("/api/categories", categoriesRouter);

// En production (Render), le build du frontend (frontend/dist) est servi par
// ce même serveur Express : une seule URL, pas de souci CORS. En dev, le
// frontend tourne séparément via `vite` (npm run dev sur le port 5173) et ce
// dossier n'existe pas encore, donc ce bloc est simplement ignoré.
if (existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get(/^(?!\/api\/).*/, (req: Request, res: Response) => {
    res.sendFile(join(FRONTEND_DIST, "index.html"));
  });
}

// Gestion d'erreurs centralisée (ex: JSON.parse invalide dans express.json())
// Les 4 paramètres sont requis : c'est ainsi qu'Express reconnaît un gestionnaire d'erreurs.
app.use((err: HttpError, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Erreur serveur." });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Route introuvable." });
});

app.listen(PORT, () => {
  console.log(`API agenda disponible sur http://localhost:${PORT}`);
});
