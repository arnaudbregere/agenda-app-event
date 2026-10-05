# Implementation Plan: Filtre des événements par catégorie

**Branch**: `001-events-category-filter` | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-events-category-filter/spec.md`

## Summary

`GET /api/events?category=<id>` renvoie uniquement les événements de la catégorie
demandée. Sans paramètre, comportement inchangé. Valeur inconnue, vide, en casse
différente ou répétée : `400` au format `{ "errors": ["..."] }` (clarification
2026-10-05). Backend uniquement, sans UI.

## Technical Context

**Language/Version**: TypeScript 5 / Node 20 (`strict: true`, backend)

**Primary Dependencies**: Express 4, `@types/express` 4 ; pas de nouvelle dépendance

**Storage**: `backend/data/events.json` (JSON, inchangé)

**Testing**: Vitest (unitaire `utils/`, intégration supertest `app.test.ts`), `npm run typecheck`

**Target Platform**: Render (Linux), service unique

**Project Type**: web-service (API REST), backend uniquement

**Performance Goals**: aucune cible nouvelle ; filtrage en mémoire sur la liste existante

**Constraints**: réponse sans paramètre identique à l'existant (même contenu, même ordre)

**Scale/Scope**: une route modifiée, une validation ajoutée, six valeurs admises

## Constitution Check

*GATE: passé avant la recherche, revérifié après le design.*

- **I. Persistance simple** : aucun changement de stockage. PASS.
- **II. Backend en couches, validation à la frontière** : la valeur `category` est lue
  depuis la requête et validée avant le contrôleur, sur le modèle de `withBody`.
  Routes via `createTypedRouter`. PASS.
- **III. Typage strict, pas de `any`** : `req.query` reste `unknown` jusqu'au parseur,
  puis narrowé en `CategoryId | undefined`. PASS.
- **IV. Frontend** : non concerné (pas d'UI). N/A.
- **V. Design** : non concerné. N/A.
- **VI. Tests et CI** : tests unitaires du parseur, tests HTTP des trois scénarios,
  typecheck. PASS.

Aucune violation : section « Complexity Tracking » non requise.

## Project Structure

### Documentation (this feature)

```text
specs/001-events-category-filter/
├── spec.md
├── plan.md              # ce fichier
├── research.md          # décisions de phase 0
├── data-model.md        # aucune nouvelle entité
├── quickstart.md        # commandes de validation
├── contracts/
│   └── events-list.md   # contrat de GET /api/events
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
backend/src/
├── routes/events.ts               # route GET "/" : ajout du middleware de filtre
├── middleware/validateQuery.ts    # nouveau : withQuery, sur le modèle de validateBody.ts
├── utils/validators.ts            # parseCategoryQuery (nouvelle fonction)
├── controllers/eventsController.ts# getEvents filtre sur la catégorie
└── app.ts                         # inchangé

backend/src/
├── utils/validators.test.ts       # tests unitaires parseCategoryQuery
└── app.test.ts                    # tests HTTP GET /api/events?category=
```

**Structure Decision** : mono-package backend, pas de nouveau package. Le parseur
vit dans `utils/validators.ts` avec les autres validateurs.

## Phase 0 : research

Aucune inconnue (NEEDS CLARIFICATION) dans le contexte technique. Voir `research.md`.

## Phase 1 : design

- Données : aucune nouvelle entité, voir `data-model.md`.
- Contrat : `contracts/events-list.md`.
- Validation : `quickstart.md`.

## Post-design Constitution Check

Re-vérifié après design : PASS sur I, II, III, VI. Pas de nouvelle dépendance.
