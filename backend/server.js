import express from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import eventsRouter from "./src/routes/events.js";
import categoriesRouter from "./src/routes/categories.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/events", eventsRouter);
app.use("/api/categories", categoriesRouter);

// En production (Render), le build du frontend (frontend/dist) est servi par
// ce même serveur Express : une seule URL, pas de souci CORS. En dev, le
// frontend tourne séparément via `vite` (npm run dev sur le port 5173) et ce
// dossier n'existe pas encore, donc ce bloc est simplement ignoré.
const distPath = join(__dirname, "../frontend/dist");
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(join(distPath, "index.html"));
  });
}

// Gestion d'erreurs centralisée (ex: JSON.parse invalide dans express.json())
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Erreur serveur." });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route introuvable." });
});

app.listen(PORT, () => {
  console.log(`API agenda disponible sur http://localhost:${PORT}`);
});
