import express from "express";
import cors from "cors";
import eventsRouter from "./src/routes/events.js";
import categoriesRouter from "./src/routes/categories.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/events", eventsRouter);
app.use("/api/categories", categoriesRouter);

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
