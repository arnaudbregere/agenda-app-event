# Agenda

Application de calendrier (façon Google Agenda) — **Vue 3** (frontend) + **Node/Express** (API REST) avec stockage des événements dans un fichier JSON. Frontend en **TypeScript strict** ; backend en cours de migration vers TypeScript (voir [Migration TypeScript](#migration-typescript)).

🔗 **App déployée : [agenda-app-event.onrender.com](https://agenda-app-event.onrender.com/)**

## Structure

```
agenda-app-event/
├── backend/     API Express — CRUD événements, stockage data/events.json
└── frontend/    App Vue 3 + Vite + Pinia — vues Mois/Semaine/Jour/Liste
```

## Démarrage

Deux serveurs à lancer en parallèle (deux terminaux) :

```bash
# Terminal 1 — API (http://localhost:4000)
cd backend
npm install
npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

Ouvrir http://localhost:5173.

### Tests et vérifications

```bash
# Dans backend/ et dans frontend/
npm test              # Vitest (vitest run)
npm run typecheck     # tsc --noEmit (backend) / vue-tsc --noEmit (frontend)

# Build
cd frontend && npm run build   # -> frontend/dist
cd backend && npm run build    # -> backend/dist (tsc), lancé par npm start
```

## Backend

- `GET /api/events`, `POST /api/events`, `PUT /api/events/:id`, `DELETE /api/events/:id`
- `GET /api/categories`
- Les événements sont persistés dans `backend/data/events.json` (aucune base de données).
- Port configurable via la variable d'env `PORT` (défaut `4000`).
- **Build** : `npm run build` compile `server.ts` et `src/` (hors tests) vers `backend/dist/` avec `tsc` (`tsconfig.build.json`). En production, le serveur démarre depuis le build : `node backend/dist/server.js` (`npm start` en local, après un `npm run build`). En dev, `npm run dev` lance les sources TypeScript directement avec `tsx watch server.ts` (sans build).
- `src/utils/paths.ts` retrouve la racine du backend en remontant jusqu'à `package.json` : les chemins de `data/events.json` et de `frontend/dist` restent valides depuis les sources comme depuis `dist/`.
- `GET /api/health` (utilisé par Render) renvoie `{ status, commit }`.

## Frontend

- Vue 3 (`<script setup lang="ts">`), **TypeScript** en mode `strict` (`npm run typecheck`), Pinia pour l'état (événements + navigation calendrier), `date-fns` pour les calculs de dates.
- **SCSS** organisé selon la méthodologie **ITCSS** (`frontend/src/styles`) : Settings → Tools → Generic → Elements → Objects → Components → Utilities, composé via `@use` (modules Sass). Design tokens en custom properties CSS (thémabilité à l'exécution) ; breakpoints en variables Sass consommées par un mixin (`respond-down()`), seul cas où le CSS natif ne suffit pas. Pas de framework CSS externe.
- URL de l'API configurable via `frontend/.env.development` (`VITE_API_URL`).

## Fonctionnalités

- Vues Mois / Semaine / Jour / Liste, navigation (aujourd'hui, précédent/suivant), mini-calendrier de navigation rapide.
- Accès direct au jour, à la semaine ou au mois en cours depuis la barre latérale, sans passer par le calendrier.
- Création / édition / suppression d'événements (titre, description, lieu, dates, toute la journée, catégorie).
- 6 catégories colorées avec filtre par catégorie dans la barre latérale.
- Recherche plein texte (titre, description, lieu), avec les résultats affichés dans une liste sous la barre de recherche, sans passer par la vue Liste.

## Déploiement

L'app est prête pour un déploiement en **un seul service Render** (voir `render.yaml` à la racine) : le build du frontend (`frontend/dist`) est servi directement par le serveur Express, donc une seule URL, sans souci de CORS.

1. Sur [render.com](https://dashboard.render.com), **New +** → **Blueprint**, connecter le repo GitHub `agenda-app-event`. Render détecte `render.yaml` et configure tout automatiquement (build + start command).
2. Une fois déployé, remplacer le lien tout en haut de ce README par l'URL fournie par Render (`https://agenda-app-event.onrender.com` ou équivalent).

Commandes définies dans `render.yaml` :

- Build : `cd frontend && npm ci && npm run build && cd ../backend && npm ci && npm run build`
- Start : `node backend/dist/server.js`
- Health check : `/api/health`

**Le déploiement est piloté par GitHub Actions**, pas par l'auto-deploy de Render (`autoDeploy: false`). Sur chaque push sur `main` (donc à chaque merge de PR), le workflow `.github/workflows/tests.yml` lance les tests et le build backend, puis le job `deploy` appelle l'API Render, attend que le déploiement soit `live` et vérifie `/api/health`. Le job `deploy` est ignoré sur les pull requests. Il nécessite les secrets GitHub `RENDER_API_KEY` et `RENDER_SERVICE_ID`. `main` est protégée : tout changement passe par une PR, mergée en squash une fois la CI verte.

✅ Déployé : **https://agenda-app-event.onrender.com/**

⚠️ **Limite du plan gratuit Render** : le disque n'est pas persistant sur les instances free — `backend/data/events.json` peut être réinitialisé à chaque redéploiement ou redémarrage après une période d'inactivité. Pour une persistance fiable, ajouter un [Disk Render](https://render.com/docs/disks) (nécessite un plan payant) monté sur `backend/data`.

## Migration TypeScript

| Étape | Contenu | État |
|---|---|---|
| 1 à 4 | Frontend : socle, `api/`, `stores/`, `composables/` + `components/` | Fait |
| 5 | `strict: true` sur le frontend | Fait |
| 6 | Backend : socle `tsc`, build vers `dist/` et `render.yaml` | Fait |
| 6 (suite) | Backend : conversion de tous les fichiers en `.ts` (`utils/`, `services/`, `controllers/`, `routes/`, `server.ts`) | Fait |
| 6 (fin) | Backend : `strict: true` | À faire |
| 7 | Conversion des tests `*.test.js` en `.ts` (frontend puis backend) | À faire |
| 8 | Job `typecheck` dans la CI | À faire |

`typescript` est épinglé en `6.x` (`6.0.3`) tant que `vue-tsc` n'est pas compatible avec TypeScript 7.

## Pistes d'amélioration possibles

- Événements récurrents (quotidien / hebdomadaire / mensuel).
- Drag & drop des événements pour les déplacer/redimensionner.
- Export/import iCal (.ics).
- Authentification si l'app doit devenir multi-utilisateur.
- Tests d'intégration de l'API côté backend (les tests unitaires Vitest existent déjà, backend et frontend).
