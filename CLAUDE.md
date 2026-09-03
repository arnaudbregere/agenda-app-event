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
└── frontend/    App Vue 3 + Vite + Pinia — vues Mois/Semaine/Jour/Liste
```

Règles détaillées par stack : @.claude/rules/frontend.md et
@.claude/rules/backend.md.

## Workflow git

- `main` est **protégée** : jamais de push direct, toujours une branche +
  PR (`gh pr create`), même pour des changements mineurs.
- Nommage de branche par convention de préfixe : `chore/...`, `docs/...`,
  `fix/...`, `feat/...`.
- CI GitHub Actions (`.github/workflows/`) lance les tests backend et
  frontend sur chaque push/PR vers `main` — les deux doivent passer avant
  merge.
- Merge en squash (`gh pr merge --squash --delete-branch`).
- Render redéploie automatiquement à chaque push sur `main` (pas d'action
  manuelle nécessaire côté déploiement). Détails : @.claude/skills/deploy/SKILL.md

## Tests

- `npm test` dans `backend/` et `frontend/` (Vitest, `vitest run`).
- Toujours lancer les tests concernés après une modif avant de proposer un
  commit.

## Autres conventions

- Pas de CORS à gérer en prod : le frontend buildé est servi directement
  par Express (un seul service Render, une seule URL).
