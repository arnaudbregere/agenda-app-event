# Agenda

Application de calendrier (façon Google Agenda) — **Vue 3** (frontend) + **Node/Express** (API REST) avec stockage des événements dans un fichier JSON.

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

## Backend

- `GET /api/events`, `POST /api/events`, `PUT /api/events/:id`, `DELETE /api/events/:id`
- `GET /api/categories`
- Les événements sont persistés dans `backend/data/events.json` (aucune base de données).
- Port configurable via la variable d'env `PORT` (défaut `4000`).

## Frontend

- Vue 3 (`<script setup>`), Pinia pour l'état (événements + navigation calendrier), `date-fns` pour les calculs de dates.
- CSS organisé selon la méthodologie **ITCSS** (`frontend/src/styles`) : Settings → Tools → Generic → Elements → Objects → Components → Utilities. Pas de framework CSS externe.
- URL de l'API configurable via `frontend/.env.development` (`VITE_API_URL`).

## Fonctionnalités

- Vues Mois / Semaine / Jour / Liste, navigation (aujourd'hui, précédent/suivant), mini-calendrier de navigation rapide.
- Création / édition / suppression d'événements (titre, description, lieu, dates, toute la journée, catégorie).
- 6 catégories colorées avec filtre par catégorie dans la barre latérale.
- Recherche plein texte (titre, description, lieu).

## Déploiement

L'app est prête pour un déploiement en **un seul service Render** (voir `render.yaml` à la racine) : le build du frontend (`frontend/dist`) est servi directement par le serveur Express, donc une seule URL, sans souci de CORS.

1. Sur [render.com](https://dashboard.render.com), **New +** → **Blueprint**, connecter le repo GitHub `agenda-app-event`. Render détecte `render.yaml` et configure tout automatiquement (build + start command).
2. Une fois déployé, remplacer le lien tout en haut de ce README par l'URL fournie par Render (`https://agenda-app-event.onrender.com` ou équivalent).

✅ Déployé : **https://agenda-app-event.onrender.com/**

⚠️ **Limite du plan gratuit Render** : le disque n'est pas persistant sur les instances free — `backend/data/events.json` peut être réinitialisé à chaque redéploiement ou redémarrage après une période d'inactivité. Pour une persistance fiable, ajouter un [Disk Render](https://render.com/docs/disks) (nécessite un plan payant) monté sur `backend/data`.

## Pistes d'amélioration possibles

- Événements récurrents (quotidien / hebdomadaire / mensuel).
- Drag & drop des événements pour les déplacer/redimensionner.
- Export/import iCal (.ics).
- Authentification si l'app doit devenir multi-utilisateur.
- Tests automatisés (Vitest côté frontend, tests d'intégration API côté backend).
