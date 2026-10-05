# Tasks: Filtre des événements par catégorie

**Input**: Design documents from `/specs/001-events-category-filter/`
**Prerequisites**: plan.md (requis), spec.md (requis), research.md, data-model.md, contracts/events-list.md, quickstart.md

**Tests** : demandés par la constitution (principe VI : tests et typecheck avant commit). Ils sont
inclus dans chaque phase d'histoire.

**Organisation** : par user story (US1 P1, US2 P2, US3 P3) pour une implémentation et un test indépendants.

## Format : `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, pas de dépendance sur une tâche incomplète)
- **[Story]** : US1, US2, US3 pour les phases d'histoire uniquement

## Phase 1 : Setup

- [X] T001 Vérifier la base verte avant changement : `npm test` et `npm run typecheck` dans `backend/` (aucun fichier modifié)

## Phase 2 : Foundational (bloque toutes les histoires)

- [X] T002 Créer le middleware de validation de requête dans `backend/src/middleware/validateQuery.ts` : fonction `withQuery(parse, handler)` sur le modèle de `withBody` (`backend/src/middleware/validateBody.ts`), répond `400 { errors }` si `parse` échoue, sinon appelle le handler avec `req.query` typé

**Checkpoint** : le middleware compile (`npm run typecheck`).

## Phase 3 : User Story 1 - Lister les événements d'une catégorie (P1) MVP

**Objectif** : `GET /api/events?category=<id>` ne renvoie que les événements de cette catégorie.

**Test indépendant** : deux événements en catégories différentes, demande d'une seule catégorie, seul le bon est renvoyé.

### Tests US1

- [X] T003 [P] [US1] Ajouter les tests unitaires de `parseCategoryQuery` (cas valide renvoie la valeur typée, cas absent renvoie `undefined`) dans `backend/src/utils/validators.test.ts`
- [X] T004 [P] [US1] Ajouter le test HTTP : deux événements en `travail` et `famille`, `GET /api/events?category=travail` renvoie seulement le premier, dans `backend/src/app.test.ts`

### Implémentation US1

- [X] T005 [US1] Implémenter `parseCategoryQuery(query: unknown): ParseResult<CategoryId | undefined>` dans `backend/src/utils/validators.ts` : lit `query.category`, accepte uniquement les valeurs de `CATEGORY_IDS` (`backend/src/utils/categories.ts`)
- [X] T006 [US1] Ajouter le filtre dans `getEvents` de `backend/src/controllers/eventsController.ts` : `events.filter((e) => (e.category ?? "autre") === category)` quand une catégorie est fournie
- [X] T007 [US1] Brancher `withQuery(parseCategoryQuery, getEvents)` sur la route `GET "/"` dans `backend/src/routes/events.ts`

**Checkpoint** : `npm test` vert ; le filtre fonctionne via curl (`quickstart.md`, scénario valide).

## Phase 4 : User Story 2 - Comportement inchangé sans filtre (P2)

**Objectif** : sans paramètre, la liste est identique à celle d'avant (contenu et ordre).

**Test indépendant** : `GET /api/events` sans paramètre renvoie tous les événements dans l'ordre d'origine.

### Tests US2

- [X] T008 [P] [US2] Ajouter le test HTTP : `GET /api/events` sans paramètre renvoie tous les événements, dans l'ordre de stockage, dans `backend/src/app.test.ts`

### Implémentation US2

- [X] T009 [US2] Vérifier que `getEvents` sans catégorie renvoie `store.listEvents()` sans transformation dans `backend/src/controllers/eventsController.ts` (pas de tri ajouté)

**Checkpoint** : le test T008 passe sans modification de la liste renvoyée.

## Phase 5 : User Story 3 - Refus d'une catégorie inconnue (P3)

**Objectif** : toute valeur hors liste fermée renvoie `400 { "errors": ["..."] }`, sans liste vide trompeuse.

**Test indépendant** : `?category=inconnu` renvoie 400 avec un message qui nomme les valeurs admises.

Valeurs admises (verbatim, `data-model.md`) : `personnel`, `travail`, `important`, `famille`, `loisirs`, `autre`.

### Tests US3

- [X] T010 [P] [US3] Ajouter les tests unitaires de `parseCategoryQuery` : valeur inconnue, vide (`?category=`), casse différente (`Travail`), paramètre répété (tableau) renvoient une erreur, dans `backend/src/utils/validators.test.ts`
- [X] T011 [P] [US3] Ajouter les tests HTTP : `?category=inconnu`, `?category=Travail`, `?category=travail&category=famille` renvoient 400 avec `errors` non vide, dans `backend/src/app.test.ts`

### Implémentation US3

- [X] T012 [US3] Compléter `parseCategoryQuery` dans `backend/src/utils/validators.ts` : refuse une valeur vide, une casse différente et un tableau (paramètre répété) avec un message en français qui liste `CATEGORY_IDS`

**Checkpoint** : `npm test` vert ; les trois cas `400` du `quickstart.md` renvoient `errors`.

## Phase finale : Polish & transverse

- [X] T013 Vérifier `npm run typecheck` et `npm test` dans `backend/` (commandes de `quickstart.md`)
- [X] T014 [P] Mettre à jour `.claude/rules/backend.md` : documenter le paramètre `?category=` de `GET /api/events` à la section API

## Dépendances

- Phase 2 (T002) bloque toutes les histoires.
- US1 (T003–T007) est le MVP. US2 et US3 dépendent de `parseCategoryQuery` (T005) pour US3 (T012), et de la route (T007) pour les tests HTTP.
- US2 est indépendant de US3.

## Exécution parallèle

- T003 et T004 : fichiers différents, en parallèle.
- T010 et T011 : en parallèle, après T005.
- T008 : en parallèle de T003–T004.

## Stratégie

**MVP** : phases 1, 2, 3 (US1). Ensuite US2 (vérification de non-régression), puis US3 (erreurs).
