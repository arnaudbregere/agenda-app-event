# Agenda

Application de calendrier façon Google Agenda : gestion d'événements (vues Mois / Semaine / Jour / Liste, catégories, recherche), sans dépendre d'un service tiers.

C'est un projet portfolio/démo — la démonstration technique (Vue 3 Composition API, TypeScript strict, architecture CSS ITCSS, pipeline CI/CD) compte autant que les fonctionnalités livrées, pas d'authentification multi-utilisateur prévue.

🔗 **App déployée : [agenda-app-event.onrender.com](https://agenda-app-event.onrender.com/)**

## Stack technique

| | |
|---|---|
| Frontend | Vue 3 (Composition API, `<script setup>`), Vite, Pinia, `date-fns`, SCSS (ITCSS) |
| Backend | Node.js, Express, aucune base de données |
| Langage | TypeScript strict des deux côtés (frontend et backend), Vitest pour les tests |
| Déploiement | Render (service web unique), piloté par GitHub Actions |

## Architecture

Monorepo à deux packages indépendants, sans dépendance croisée au runtime :

```
agenda-app-event/
├── backend/     API Express — CRUD événements, stockage backend/data/events.json
└── frontend/    App Vue 3 + Vite + Pinia — vues Mois/Semaine/Jour/Liste
```

### Arborescence complète

```
agenda-app-event/
├── README.md, CLAUDE.md, PRODUCT.md, DESIGN.md   — doc du projet (README = ce fichier, CLAUDE.md = instructions
│                                                     racine pour Claude Code, PRODUCT.md = contexte produit,
│                                                     DESIGN.md = design system généré par l'outil Impeccable)
├── RAPPORT-SESSION-*.md (9 fichiers)             — comptes-rendus de sessions de travail (faits, décisions, bugs)
├── render.yaml                                    — config du déploiement Render (Blueprint)
├── tasks.xlsx                                     — source ponctuelle de tickets (à l'origine des issues #27/#28)
├── .gitignore
│
├── backend/
│   ├── server.ts                          — point d'entrée Express (routes, static, health check, erreurs)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── events.ts                  — GET/POST /api/events, GET/PUT/DELETE /api/events/:id
│   │   │   └── categories.ts              — GET /api/categories
│   │   ├── controllers/
│   │   │   └── eventsController.ts        — parsing du body, codes de statut HTTP
│   │   ├── services/
│   │   │   ├── eventsStore.ts             — lecture/écriture de data/events.json, file de promesses
│   │   │   └── eventsStore.test.ts
│   │   ├── utils/
│   │   │   ├── validators.ts              — validation des payloads événement
│   │   │   ├── validators.test.ts
│   │   │   ├── categories.ts              — 6 catégories fixes (id, label, couleur)
│   │   │   └── paths.ts                   — racine backend, valide depuis les sources comme depuis dist/
│   │   └── types.ts                       — CalendarEvent, EventPatch
│   ├── data/
│   │   └── events.json                    — stockage des événements (pas de base de données)
│   ├── tsconfig.json                      — typecheck (inclut les tests)
│   ├── tsconfig.build.json                — build (exclut les tests) -> dist/
│   ├── package.json, package-lock.json
│   └── .gitignore
│
├── frontend/
│   ├── index.html                         — unique page HTML, monte #app
│   ├── public/favicon.svg
│   ├── .env.development                   — VITE_API_URL
│   ├── src/
│   │   ├── main.ts                        — createApp(App).use(pinia).mount("#app")
│   │   ├── App.vue                        — shell : header + sidebar + vue courante + modale
│   │   ├── env.d.ts                       — types Vite (import.meta.env)
│   │   ├── api/
│   │   │   ├── client.ts                  — fetch générique, base VITE_API_URL
│   │   │   ├── events.ts                  — eventsApi, categoriesApi
│   │   │   └── types.ts                   — CalendarEvent, Category, EventInput, EventPatch
│   │   ├── stores/                        — Pinia
│   │   │   ├── events.ts, events.test.ts      (données événements/catégories, appels API)
│   │   │   └── calendar.ts, calendar.test.ts  (vue courante, filtres, recherche, modale)
│   │   ├── composables/
│   │   │   ├── useCalendarGrid.ts, .test.ts   — découpage semaines/jours, HOURS
│   │   │   └── useEventLayout.ts, .test.ts    — positionnement des événements qui se chevauchent
│   │   ├── components/
│   │   │   ├── AppHeader.vue, .test.ts
│   │   │   ├── AppSidebar.vue, .test.ts
│   │   │   ├── EventModal.vue, .test.ts   — création/édition, <Teleport to="body">
│   │   │   ├── CategoryFilter.vue, .test.ts
│   │   │   ├── MiniCalendar.vue, .test.ts
│   │   │   ├── SearchResults.vue
│   │   │   ├── ui/BaseButton.vue, ui/Icon.vue
│   │   │   └── views/
│   │   │       ├── MonthView.vue, .test.ts
│   │   │       ├── WeekView.vue, DayView.vue      (délèguent à TimeGrid)
│   │   │       ├── TimeGrid.vue, .test.ts         — grille horaire commune Semaine/Jour
│   │   │       └── ListView.vue, .test.ts
│   │   ├── test-support/
│   │   │   └── fixtures.ts                — helpers de fixtures partagés entre tests (asEvent, asEvents, asCategories)
│   │   └── styles/                        — SCSS en ITCSS (7 couches, composées via @use dans main.scss)
│   │       ├── settings/    _breakpoints, _colors, _spacing, _typography, _z-index
│   │       ├── tools/       _mixins (respond-down), _tokens (design tokens)
│   │       ├── generic/     _reset
│   │       ├── elements/    _elements
│   │       ├── objects/     _layout
│   │       ├── components/  14 fichiers, un par composant (_modal, _sidebar, _form, _event-pill, ...)
│   │       └── utilities/   _utilities
│   ├── tsconfig.json, vite.config.js
│   ├── package.json, package-lock.json
│   └── .gitignore
│
├── .github/
│   └── workflows/tests.yml                — CI : jobs backend / frontend / deploy (voir Flow CI/CD)
│
└── .claude/                               — outillage Claude Code (voir Outillage Claude Code ci-dessous)
```

### Schéma d'ensemble (runtime)

Un seul serveur Express sert à la fois l'API et le build du frontend — pas de séparation réseau entre les deux, donc pas de CORS à gérer en prod :

```
Navigateur (SPA Vue 3, une seule URL, pas de routeur)
        │
        │  HTTP (fetch)
        ▼
Serveur Express unique — backend/server.ts
        │
        ├── /api/events, /api/categories, /api/health
        │       │
        │       ▼
        │   backend/data/events.json  (fichier JSON, pas de BDD)
        │
        └── tout le reste (GET hors /api/*)
                │
                ▼
        frontend/dist  (build Vue servi en statique)
        fallback index.html pour la route SPA
```

### Backend (`backend/`)

- `server.ts` : point d'entrée Express — montage des routes, service du build frontend, health check, gestion d'erreurs centralisée.
- `src/routes/` : déclaration des routes (`events.ts`, `categories.ts`), déléguées à...
- `src/controllers/` : logique HTTP (`eventsController.ts` — parsing du body, codes de statut).
- `src/services/` : accès aux données (`eventsStore.ts` — lecture/écriture de `data/events.json`, file de promesses pour sérialiser les accès concurrents).
- `src/utils/` : validation des payloads (`validators.ts`), catégories (`categories.ts`), résolution de chemins indépendante des sources/du build (`paths.ts`).
- **Pas de base de données** : les événements sont persistés dans un simple fichier JSON (`backend/data/events.json`).

Endpoints :

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/events` | Liste des événements |
| POST | `/api/events` | Création |
| PUT | `/api/events/:id` | Modification |
| DELETE | `/api/events/:id` | Suppression |
| GET | `/api/categories` | 6 catégories fixes (personnel, travail, important, famille, loisirs, autre) |
| GET | `/api/health` | `{ status, commit }` — utilisé par Render pour le health check |

### Frontend (`frontend/`)

- `src/stores/` : état Pinia — `events.ts` (données, appels API) et `calendar.ts` (navigation, filtres, recherche, modale).
- `src/components/` : `AppHeader`, `AppSidebar`, `EventModal`, `CategoryFilter`, `MiniCalendar`, `SearchResults`, et `components/views/` pour les 4 vues (Mois, Semaine, Jour, Liste).
- `src/composables/` : logique réutilisable pure (`useCalendarGrid` — découpage en semaines/jours, `useEventLayout` — positionnement des événements qui se chevauchent).
- `src/api/` : client HTTP (`client.ts`) et appels typés (`events.ts`), URL configurable via `frontend/.env.development` (`VITE_API_URL`).
- `src/styles/` : SCSS organisé en **ITCSS** (Settings → Tools → Generic → Elements → Objects → Components → Utilities, composé via `@use`). Design tokens en custom properties CSS (thémabilité à l'exécution) ; breakpoints en variables Sass consommées par un mixin (`respond-down()`), seul cas où le CSS natif ne suffit pas. Pas de framework CSS externe.

### Plan de l'application (SPA)

Pas de `vue-router` : une seule URL, une seule page HTML (`index.html`). La navigation entre vues change l'état du store Pinia `calendarStore.currentView`, qui bascule le composant affiché sans rechargement ni changement d'URL.

```
index.html
  └── #app (main.ts monte App.vue)
        └── App.vue (o-app-shell)
              ├── AppHeader     — titre de la période, précédent/suivant, recherche, sélecteur de vue
              ├── AppSidebar    — bouton Créer, raccourcis (aujourd'hui/semaine/mois), mini-calendrier, filtre catégories
              ├── <main>        — une seule vue rendue à la fois, selon calendarStore.currentView :
              │     ├── MonthView
              │     ├── WeekView   (grille horaire commune : TimeGrid)
              │     ├── DayView    (grille horaire commune : TimeGrid)
              │     └── ListView
              └── EventModal    — <Teleport to="body">, ouverte/fermée par le store (création ou édition)
```

### Fonctionnalités

- Vues Mois / Semaine / Jour / Liste, navigation (aujourd'hui, précédent/suivant), mini-calendrier de navigation rapide, accès direct au jour/semaine/mois en cours depuis la barre latérale.
- Création / édition / suppression d'événements (titre, description, lieu, dates, toute la journée, catégorie).
- 6 catégories colorées avec filtre dans la barre latérale.
- Recherche plein texte (titre, description, lieu), résultats affichés dans une liste sous la barre de recherche.

## Démarrage local

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

Ouvrir http://localhost:5173. En prod, un seul service sert les deux (voir [Déploiement](#déploiement)).

## Tests

Même trio de commandes dans `backend/` et `frontend/` :

```bash
npm test              # Vitest (vitest run)
npm run typecheck     # tsc --noEmit (backend) / vue-tsc --noEmit (frontend)
npm run build         # frontend -> frontend/dist ; backend -> backend/dist (tsc), lancé par npm start
```

Les deux packages sont en TypeScript strict, **code et tests** : `npm run typecheck` inclut les fichiers `*.test.ts`, et la CI l'exécute (voir [Flow CI/CD](#flow-cicd)).

14 fichiers de tests Vitest au total :

| Package | Fichier | Couvre |
|---|---|---|
| Backend (2) | `src/utils/validators.test.ts` | Validation des payloads événement (champs requis, formats, dates) |
| | `src/services/eventsStore.test.ts` | CRUD + sérialisation des accès concurrents (mock de `node:fs/promises`) |
| Frontend — stores (2) | `src/stores/calendar.test.ts` | Navigation, filtres, recherche, modale |
| | `src/stores/events.test.ts` | Appels API mockés, mise à jour du state |
| Frontend — composables (2) | `src/composables/useCalendarGrid.test.ts` | Découpage semaines/jours |
| | `src/composables/useEventLayout.test.ts` | Positionnement des événements qui se chevauchent |
| Frontend — components (8) | `AppHeader`, `AppSidebar`, `CategoryFilter`, `EventModal`, `MiniCalendar`, `MonthView`, `ListView`, `TimeGrid` | Montage via `@vue/test-utils`, interactions utilisateur, intégration avec les stores |

`frontend/src/test-support/fixtures.ts` mutualise les fixtures d'événements/catégories volontairement partielles utilisées par plusieurs fichiers de tests (les stores ne valident pas leurs entrées : ces tests exercent leur mécanique, pas la conformité au schéma complet).

**Pas encore couvert** : tests d'intégration API bout en bout (démarrage réel du serveur Express) — voir [issue #58](https://github.com/arnaudbregere/agenda-app-event/issues/58).

## Flow CI/CD

Workflow unique `.github/workflows/tests.yml`, sur chaque push et pull request vers `main` :

1. **Job `backend`** : `npm ci`, `npm run typecheck`, `npm run build`, `npm test`.
2. **Job `frontend`** : `npm ci`, `npm run typecheck`, `npm test`.
3. **Job `deploy`** (uniquement sur un push vers `main`, donc à chaque merge de PR, jamais sur une pull request) : appelle l'API Render pour déclencher le déploiement, attend qu'il soit `live`, puis vérifie `GET /api/health`. Nécessite les secrets GitHub `RENDER_API_KEY` et `RENDER_SERVICE_ID`.

`main` est protégée : tout changement passe par une PR, mergée en squash une fois la CI verte (`gh pr merge --squash --delete-branch`). L'auto-deploy natif de Render est désactivé (`autoDeploy: false` dans `render.yaml`) — c'est le job `deploy` ci-dessus qui pilote entièrement le déploiement, pas Render lui-même.

## Déploiement

Un seul service Render (config dans `render.yaml` à la racine) : le build du frontend (`frontend/dist`) est servi directement par le serveur Express, donc une seule URL, sans souci de CORS.

```yaml
# render.yaml
buildCommand: cd frontend && npm ci && npm run build && cd ../backend && npm ci && npm run build
startCommand: node backend/dist/server.js
healthCheckPath: /api/health
```

Pour redéployer ailleurs : sur [render.com](https://dashboard.render.com), **New +** → **Blueprint**, connecter le repo GitHub. Render détecte `render.yaml` et configure tout automatiquement.

⚠️ **Limite du plan gratuit Render** : le disque n'est pas persistant sur les instances free — `backend/data/events.json` peut être réinitialisé à chaque redéploiement ou redémarrage après une période d'inactivité. Pour une persistance fiable, ajouter un [Disk Render](https://render.com/docs/disks) (nécessite un plan payant) monté sur `backend/data`.

## Outillage Claude Code (agents, skills, règles)

Ce projet est développé avec [Claude Code](https://claude.com/claude-code), et son outillage propre est versionné dans le dépôt.

**Propre au projet** (`.claude/`) :

| Fichier | Rôle |
|---|---|
| `CLAUDE.md` | Instructions racine (structure, workflow git, tests) chargées automatiquement en début de session |
| `.claude/rules/frontend.md`, `backend.md` | Conventions détaillées par stack (Composition API, ITCSS, pas de BDD, route `/api/health`, etc.) |
| `.claude/agents/reviewer.md` | Sous-agent de revue de diff/PR, avec les conventions spécifiques à ce dépôt |
| `.claude/agents/tester.md` | Sous-agent qui écrit/complète des tests Vitest et diagnostique les échecs |
| `.claude/skills/deploy/SKILL.md` | Check-list et procédure de déploiement Render |
| `.claude/skills/rapport-session/SKILL.md` | Génère les `RAPPORT-SESSION-*.md` en fin de session |
| `.claude/skills/trello/` | CRUD sur des cartes Trello via un script Node réutilisable (`trello.mjs`) |
| `.claude/settings.json` | Configuration Claude Code du projet (`.claude/settings.local.json`, non commité, pour les réglages locaux) |
| `PRODUCT.md` | Contexte produit (utilisateurs, positionnement, contraintes) consommé par le skill Impeccable |

**Skill installée (vendored)** : `.claude/skills/impeccable/` (design system, audit UI, 35 fichiers de référence + scripts) et ses 4 agents dédiés (`.claude/agents/impeccable-*.md`) sont une installation du marketplace, pas du code écrit pour ce projet — `DESIGN.md` et `.impeccable/design.json` sont ses sorties générées. `.github/agents/`, `.github/skills/impeccable/` et `.github/hooks/impeccable.json` sont un miroir exact de cette même installation, généré automatiquement pour l'outillage côté GitHub ; `.claude/` reste la copie de référence.
