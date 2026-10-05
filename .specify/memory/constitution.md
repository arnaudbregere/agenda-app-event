# agenda-app-event Constitution

## Core Principles

### I. Persistance simple, sans base de données
Les événements sont stockés dans `backend/data/events.json`. Le format MUST rester du JSON lisible, sans schéma implicite non documenté. Aucune base de données n'est introduite sans décision explicite consignée dans `CLAUDE.md`. Les suites de tests MUST isoler leurs données via `EVENTS_DATA_FILE` et ne JAMAIS toucher `backend/data/events.json`.

### II. Backend en couches, validation à la frontière
Le backend suit `routes/` → `controllers/` → `services/`. `src/app.ts` exporte l'app Express sans appeler `listen()` ; `server.ts` seul ouvre le port. Toute donnée HTTP non fiable MUST être validée à la frontière (`parseEventBody` / `parseEventPatch`, middleware `withBody`) avant d'atteindre un handler. Les routes sont déclarées via le routeur typé (`createTypedRouter`), qui impose le typage des paramètres et du corps.

### III. Typage strict, `any` interdit
Backend et frontend MUST compiler en `strict: true`. `any` est interdit dans le code nouveau. `unknown` n'est admis qu'à la frontière d'entrée (corps brut) et MUST être narrowé avant usage. Chaque package (`backend/`, `frontend/`, `e2e/`) MUST avoir `typescript`, `@types/node` si nécessaire, et un script `typecheck` exécuté en CI.

### IV. Frontend Vue 3 : Composition API et conventions du repo
Les composants utilisent exclusivement `<script setup>`, sans Options API dans le code nouveau. Les fonctions sont fléchées (`const f = () => {}`), sans `function` ni `async function` déclarées dans le code nouveau. L'état partagé passe par Pinia (`frontend/src/stores`). Les dates passent par `date-fns`, jamais par manipulation manuelle de `Date`. L'URL de l'API vient de `VITE_API_URL`, jamais codée en dur.

### V. Design et accessibilité sont des critères de revue
Toute modification UI (`frontend/**/*.vue`, `*.scss`) MUST respecter `DESIGN.md` : tokens CSS (pas de valeur hors `--space-*`, `--radius-*`, `--shadow-*`), One Accent Rule (`google-blue` réservé aux actions primaires, à l'état actif et au jour courant), Flat-By-Default (pas d'ombre au repos hors panneau flottant). Les critères d'accessibilité RGAA 4.1 / WCAG 2.1 AA de `PRODUCT.md` s'appliquent à tout composant interactif nouveau ou modifié. Un écart documenté dans `DESIGN.md` est la seule dérogation admise.

### VI. Tests et CI avant tout merge
Avant chaque commit, les tests ET le typecheck des packages touchés MUST passer. Le backend utilise Vitest (tests unitaires et d'intégration supertest). Le frontend utilise Vitest. La suite `e2e/` utilise Playwright, avec `workers: 1` et `fullyParallel: false`, sur un seul backend réel et un seul fichier de données. Les jobs `backend`, `frontend` et `e2e` MUST être verts avant merge.

## Stack et contraintes d'exploitation

- Un seul service Render : le build frontend (`frontend/dist`) est servi par Express. Pas de CORS en production.
- `PORT` est lu depuis l'environnement, défaut `4000`. Ne jamais coder le port en dur.
- `GET /api/health` est utilisée par Render (`healthCheckPath`). Ne pas la renommer sans mettre à jour `render.yaml`.
- Le disque du plan gratuit Render n'est pas persistant : les données de prod ne sont pas durables tant qu'un Disk n'est pas ajouté.
- Le fuseau de l'agenda est `APP_TIMEZONE` (défaut `Europe/Paris`), indépendant du fuseau du serveur.

## Workflow git et livraison

- `main` est protégée : jamais de push direct. Chaque changement passe par une branche (`chore/`, `docs/`, `fix/`, `feat/`) et une PR.
- Avant tout `git push` et tout merge, présenter le contenu et attendre l'accord explicite de l'auteur.
- Merge en squash avec suppression de la branche : `gh pr merge --squash --delete-branch`.
- Le merge sur `main` déclenche le job `deploy` de `tests.yml` (Render), après succès des jobs `backend`, `frontend` et `e2e`. Vérifier ensuite `/api/health`.
- Les décisions de design se prennent dans `DESIGN.md`. Un écart volontaire s'y documente avant le commit.

## Governance

Cette constitution prévaut sur les autres pratiques écrites dans le dépôt. En cas de contradiction entre `CLAUDE.md`, `.claude/rules/*.md`, `DESIGN.md` ou `PRODUCT.md`, l'agent MUST le signaler au lieu de trancher (voir `CLAUDE.md`, section « Design et agents »).

Procédure d'amendement : modification de ce fichier via une PR dédiée, avec justification dans la description. Les amendements MUST être approuvés par l'auteur du projet avant merge.

Politique de version : MAJOR pour suppression ou redéfinition incompatible d'un principe ; MINOR pour un principe ou une section ajoutée ; PATCH pour clarifications et corrections de forme.

Conformité : la revue de PR MUST vérifier le respect des principes. L'agent `reviewer` (`.claude/agents/reviewer.md`) contrôle les conventions du repo, y compris `DESIGN.md` pour le frontend. Toute complexité ajoutée MUST être justifiée dans la PR.

**Version**: 1.0.0 | **Ratified**: 2026-09-03 | **Last Amended**: 2026-10-05
