# Règles e2e (`e2e/`)

- **Playwright**, package indépendant (pas dans `frontend/`) : ne dépend
  d'aucun des deux autres packages au runtime npm (pas de dépendance
  croisée dans `package.json`), mais déclenche leurs commandes en
  sous-processus via `webServer.command` dans `playwright.config.ts`.
- Mode de lancement : ce `webServer.command` lance `npm run build
  --prefix ../frontend` (Vite, pas Playwright, qui produit `frontend/dist`),
  puis le **vrai** serveur Express backend (`npx tsx
  ../backend/server.ts`) qui sert ce build statiquement — exactement le
  setup de prod (voir `backend/src/app.ts`, bloc `FRONTEND_DIST`). Jamais
  de `vite preview` séparé : ça réintroduirait une divergence avec la
  prod (CORS, origine).
- Port dédié (`E2E_PORT`, 4310 par défaut) et fichier de données isolé
  (`EVENTS_DATA_FILE`, voir `backend/src/utils/paths.ts`) — jamais
  `backend/data/events.json`. `resetEvents()` (dans `tests/support/`) vide
  ce fichier en `beforeEach` de chaque spec.
- `workers: 1` et `fullyParallel: false` dans `playwright.config.ts` :
  tous les tests partagent un seul backend réel et un seul fichier JSON —
  pas de parallélisation sans risque de collision entre specs.
- Sélecteurs : privilégier les rôles ARIA/labels accessibles
  (`getByRole`, `getByLabel`) plutôt que des classes CSS, cohérent avec
  l'effort d'accessibilité du frontend (@.claude/rules/frontend.md). Les
  vues calendrier (Mois/Semaine/Jour/Liste) n'ont pas encore de rôles
  dédiés : les specs `views.spec.ts` retombent sur des sélecteurs de
  classe BEM (`.c-time-grid__head-day`, ...) en attendant.
- `backend/` et `frontend/` doivent avoir leurs dépendances installées
  (`npm install`) avant de lancer `e2e/` : le `webServer` appelle
  directement `npm run build --prefix ../frontend` et `npx tsx
  ../backend/server.ts`, sans `npm ci` préalable.
- Comme tout package JS/TS du repo : `typescript` + `@types/node` en
  devDependencies, script `typecheck`, étape correspondante dans le job CI
  `e2e` (voir CLAUDE.md racine — oubli déjà constaté une fois ici).

## Tests

- Playwright (`npm test` = `playwright test`). Nécessite Chromium installé
  une fois (`npx playwright install chromium`).
- `npm run typecheck` (`tsc --noEmit`) — Playwright exécute les specs via
  `tsx`/esbuild, qui ne vérifie pas les types : seul `typecheck` le fait.
