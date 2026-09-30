# Règles backend (`backend/`)

- API REST Express classique : `GET/POST/PUT/DELETE /api/events`,
  `GET /api/categories`.
- **Pas de base de données** — persistance dans
  `backend/data/events.json`. Toute modification doit rester
  lisible/écrivable en JSON simple (pas de schéma implicite non
  documenté).
- Port configurable via la variable d'env `PORT` (défaut `4000`) — ne
  jamais coder `4000` en dur dans une route ou un test.
- Route de santé `GET /api/health` — utilisée par Render
  (`healthCheckPath` dans `render.yaml`) : ne pas la supprimer/renommer
  sans mettre à jour `render.yaml` en même temps.
- En prod, le build frontend (`frontend/dist`) est servi directement par
  ce serveur Express (service unique Render) — pas de config CORS à
  maintenir pour cet usage ; `cors` (dépendance présente) sert au dev
  local (frontend sur un port différent).
- `src/app.ts` exporte l'app Express (routes, middlewares, erreurs) sans
  appeler `.listen()` — `server.ts` à la racine s'en charge seul.
  Séparation nécessaire pour `src/app.test.ts`, qui pilote l'app avec
  `supertest` sans ouvrir de port réseau. Toute route/middleware ajouté
  doit vivre dans `app.ts`, jamais dans `server.ts`.

## ⚠️ Limite connue — stockage non persistant sur Render free

Le disque n'est pas persistant sur le plan gratuit Render :
`backend/data/events.json` peut être réinitialisé à chaque redéploiement
ou redémarrage après inactivité. Ne pas considérer les données de prod
comme durables tant qu'un [Disk Render](https://render.com/docs/disks)
n'est pas ajouté.

## Tests

- Vitest (`npm test` = `vitest run`, `npm run test:watch` pour le mode
  watch).
- Deux niveaux : tests unitaires (`eventsStore.test.ts`,
  `validators.test.ts` — chaque couche isolée) et tests d'intégration
  (`app.test.ts` — cycle HTTP complet via `supertest`, `routes/` →
  `controllers/` → `services/`). Les deux mockent `node:fs/promises` en
  mémoire (même pattern `fsState`) pour ne jamais toucher
  `backend/data/events.json` pendant les tests.
