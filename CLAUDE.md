# agenda-app-event

Application de calendrier (façon Google Agenda) — **Vue 3** (frontend) +
**Node/Express** (API REST), stockage des événements dans un fichier JSON
(pas de base de données).

Déployée sur Render (service unique, backend + build frontend) :
https://agenda-app-event.onrender.com/

## Structure

```
agenda-app-event/
├── backend/     API Express — CRUD événements, stockage backend/data/events.json
├── frontend/    App Vue 3 + Vite + Pinia — vues Mois/Semaine/Jour/Liste
└── e2e/         Suite e2e Playwright (frontend+backend réels)
```

Règles détaillées par stack : @.claude/rules/frontend.md,
@.claude/rules/backend.md et @.claude/rules/e2e.md.

Chaque package JS/TS (`backend/`, `frontend/`, `e2e/`, tout futur package)
doit avoir son propre `typescript` en devDependency, un script
`typecheck`, et l'étape correspondante dans le job CI associé — même s'il
n'a pas de build de prod. Oubli constaté une fois sur `e2e/` (créé sans
`typescript`/`@types/node` : erreurs TS invisibles tant que personne
n'ouvrait le fichier dans un éditeur, `npm test` ne typecheckant pas).

## Workflow git

- `main` est **protégée** : jamais de push direct, toujours une branche +
  PR (`gh pr create`), même pour des changements mineurs.
- Nommage de branche par convention de préfixe : `chore/...`, `docs/...`,
  `fix/...`, `feat/...`.
- **Avant tout `git push`** (y compris un simple commit de correctif sur
  une branche déjà poussée) : présenter à l'utilisateur ce qui va être
  poussé (résumé du diff + résultat des commandes de vérification
  lancées) et attendre son accord explicite. Ne jamais enchaîner
  commit → push sans ce point de passage, même pour un fix mineur.
- CI GitHub Actions (`.github/workflows/`) lance les jobs `backend`,
  `frontend` et `e2e` sur chaque push/PR vers `main` — les trois doivent
  passer avant merge.
- Merge en squash (`gh pr merge --squash --delete-branch`).
- Render redéploie automatiquement à chaque push sur `main` (pas d'action
  manuelle nécessaire côté déploiement). Détails : @.claude/skills/deploy/SKILL.md

## Design et agents

Les fichiers de contexte sont la source unique : ne pas recopier leur contenu
ailleurs, pointer vers eux.

| Tâche | Lire d'abord | Faire ensuite |
|---|---|---|
| Toute modif UI (`frontend/**/*.vue`, `*.scss`) | `DESIGN.md` (tokens, boutons, règles), `PRODUCT.md` (accessibilité) | `/impeccable detect` sur les fichiers touchés ; `/impeccable critique` si composition ou hiérarchie change |
| Relecture de PR | `.claude/rules/*.md` selon le package | agent `reviewer` (vérifie aussi `DESIGN.md` si `frontend/` est touché) |
| Nouvelle feature frontend | `PRODUCT.md` (périmètre), `DESIGN.md` | `/impeccable shape` avant de coder |
| Tests | `.claude/rules/backend.md`, `frontend.md`, `e2e.md` | agent `tester` |
| Déploiement | `.claude/skills/deploy/SKILL.md` | job `deploy` de `tests.yml` |

Règles de passage :
- Un agent qui trouve une règle contradictoire dans ces fichiers le signale au
  lieu de choisir. Exemple actuel : `DESIGN.md` interdit l'ombre au repos sur le
  bouton « Créer » dans un passage et l'autorise dans un autre.
- Les décisions de design se prennent dans `DESIGN.md`, pas dans le code.
  Un écart volontaire se documente dans `DESIGN.md` avant le commit.

## Tests

- `npm test` dans `backend/`, `frontend/` et `e2e/` (Vitest pour les deux
  premiers, Playwright pour `e2e/`).
- `npm run typecheck` dans les trois packages — ne pas se fier uniquement
  à `npm test` : ni Vitest (transform esbuild) ni Playwright (`tsx`) ne
  font de vérification de types complète.
- Toujours lancer les tests **et** le typecheck des packages concernés
  après une modif, avant de proposer un commit.

## Autres conventions

- Pas de CORS à gérer en prod : le frontend buildé est servi directement
  par Express (un seul service Render, une seule URL).
