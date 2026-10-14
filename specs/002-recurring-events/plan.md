# Implementation Plan: Événements récurrents

**Branch**: `feat/recurring-events-54` | **Date**: 2026-10-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-recurring-events/spec.md`

> Le répertoire de spécification est `002-recurring-events` ; la branche git suit
> la convention de préfixe du dépôt (`feat/...`, voir `CLAUDE.md`). Les deux noms
> diffèrent volontairement.

## Summary

Une série récurrente est **une** entrée de `backend/data/events.json` portant une
règle (`freq`, `interval`, `until`), ses dates exclues (`exdates`) et, pour une
occurrence modifiée seule, un événement de surcharge rattaché à elle. Le backend
stocke et valide la **forme** de la règle, et rien de plus : aucun calcul de dates
n'y entre. Les occurrences sont développées à l'affichage par un module de
fonctions pures du frontend, borné à 500 occurrences par série, derrière un point
d'accès unique au store qui remplace l'accesseur actuel.

Approche retenue au terme de la recherche : chaque occurrence est calculée
**depuis l'ancre** (`addMonths(ancre, i × interval)`), jamais en cascade depuis
l'occurrence précédente — la sonde de la phase 0 montre que la cascade perd
définitivement le 31 du mois après le premier écrêtage.

## Technical Context

**Language/Version**: TypeScript 6.0.3 (`strict: true`), Node 20 (CI et Render), Vue 3.5

**Primary Dependencies**: `date-fns` 4.4.0 (frontend, seul outil de calcul de dates) · Pinia 4.0.3 · Express (backend) · aucune dépendance nouvelle

**Storage**: fichier JSON (`backend/data/events.json`), surchargeable par `EVENTS_DATA_FILE`. Pas de base de données. `backend/src/services/eventsStore.ts` **n'est pas modifié**.

**Testing**: Vitest (`backend/`, `frontend/`) · Playwright (`e2e/`, `workers: 1`) · `tsc --noEmit` / `vue-tsc --noEmit` dans les trois paquets

**Target Platform**: navigateurs modernes ; un seul service web Render (le build frontend est servi par Express)

**Project Type**: application web, trois paquets npm indépendants (`backend/`, `frontend/`, `e2e/`)

**Performance Goals**: développement des occurrences effectué **une fois par rendu et par vue**, pas une fois par cellule. Contrainte issue de SC-011 et du constat ci-dessous sur les getters Pinia paramétrés.

**Constraints**: plafond dur de 500 occurrences par série dans le développeur (borne d'affichage, pas validation de donnée) · fuseau de l'agenda `APP_TIMEZONE` indépendant de celui du serveur · compatibilité ascendante totale : un événement sans attribut de récurrence doit fonctionner sans migration

**Scale/Scope**: utilisateur unique, quelques centaines d'événements stockés. 4 vues, 1 modale, 1 dialogue de confirmation, 1 module pur nouveau, 1 accesseur de store remplacé.

### Fait technique vérifié qui contraint la conception

Un getter Pinia qui renvoie une fonction n'est **pas** mémoïsé par argument : le
getter lui-même est mis en cache, mais la fonction renvoyée s'exécute entièrement
à chaque appel. `occurrencesIn(from, to)` développe donc toutes les séries à
chaque invocation.

Conséquence contraignante : chaque vue appelle `occurrencesIn` **une seule fois
par rendu**, dans un `computed`, puis regroupe le résultat localement. Le dépôt a
déjà ce réflexe, documenté en commentaire à `frontend/src/components/views/MonthView.vue:17-19`
(« Groupé une seule fois par rendu […] plutôt que de refiltrer/retrier
`store.filteredEvents` à chaque appel »). `TimeGrid.vue` appelle aujourd'hui
`filteredEvents` deux fois (lignes 33 et 37) : ces deux appels doivent se fondre
en un seul `computed`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principe | Statut | Justification |
|---|---|---|
| **I. Persistance simple, sans base de données** | ✅ PASS | Aucune base introduite. Trois attributs optionnels ajoutés au schéma JSON, documentés dans [data-model.md](./data-model.md) — donc pas de « schéma implicite non documenté ». `eventsStore.ts` inchangé. Les tests continuent d'isoler leurs données via `EVENTS_DATA_FILE` et de simuler `node:fs/promises`. |
| **II. Backend en couches, validation à la frontière** | ✅ PASS | Aucune route nouvelle : tout passe par les routes existantes de `src/routes/events.ts`, via `withBody(parseEventBody)` et `withBody(parseEventPatch)`. Validation entièrement dans `src/utils/validators.ts`. `src/app.ts` et `server.ts` intouchés. |
| **III. Typage strict, `any` interdit** | ✅ PASS | Aucun `any`. `unknown` reste confiné à `readFields` et narrowé avant usage. Le type d'occurrence est distinct du type d'événement stocké, avec identifiant marqué : passer une occurrence à l'API échoue à la compilation (NFR-009). |
| **IV. Frontend Vue 3 : Composition API et conventions** | ✅ PASS | `<script setup>` partout, fonctions fléchées uniquement, état partagé dans Pinia, calculs de dates exclusivement par `date-fns`. Aucune manipulation manuelle de `Date` dans le nouveau module. |
| **V. Design et accessibilité comme critères de revue** | ⚠️ PASS SOUS CONDITION | Aucun jeton, rayon, ombre ni couleur nouveaux : la fonctionnalité se construit sur `--space-*`, `--radius-sm`, la typographie `caption`/`label` existantes. **Condition** : `DESIGN.md` doit être mis à jour **avant** le commit (fieldset révélé, radiogroup de portée, modification du composant signature Event Pill). Suivi comme tâche bloquante, pas comme nettoyage de fin. |
| **VI. Tests et CI avant tout merge** | ✅ PASS | Vitest backend (validation) et frontend (module pur en priorité, puis store et modale), Playwright pour le parcours complet, `typecheck` dans les trois paquets. |

**Verdict de la porte : franchie.** Un seul point conditionnel (principe V), tracé
comme tâche bloquante plutôt que laissé à la bonne volonté.

### Contradictions relevées dans les fichiers de contexte

Aucune. `CLAUDE.md`, `.claude/rules/*.md`, `DESIGN.md`, `PRODUCT.md` et la
constitution sont cohérents sur ce périmètre.

Un point mérite d'être **signalé sans être tranché ici**, conformément à la
clause de gouvernance : `.claude/rules/backend.md` décrit l'import iCal en notant
que « Les récurrences (RRULE) non développées à l'import ». Cette phrase décrit
l'état actuel et reste vraie après cette fonctionnalité, mais elle deviendra
ambiguë dès que l'export émettra des `RRULE` (issue de suivi, hors périmètre). À
reformuler dans l'issue de suivi, pas dans cette PR.

## Project Structure

### Documentation (this feature)

```text
specs/002-recurring-events/
├── plan.md              # Ce fichier
├── research.md          # Phase 0 — sonde date-fns, décisions de calcul
├── data-model.md        # Phase 1 — schéma JSON, entités, règles de validation
├── quickstart.md        # Phase 1 — scénarios de validation exécutables
├── contracts/
│   ├── events-api.md    # Contrat HTTP : attributs ajoutés, routes inchangées
│   └── recurrence-module.md  # Surface publique du module pur de développement
├── checklists/
│   └── requirements.md  # Déjà écrit par /speckit-specify
└── tasks.md             # Phase 2 — produit par /speckit-tasks, PAS par /speckit-plan
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── types.ts                 # MODIFIÉ  CalendarEvent + EventBody : 3 attributs
│   ├── utils/
│   │   ├── validators.ts        # MODIFIÉ  type Fields + validation de la règle
│   │   └── validators.test.ts   # MODIFIÉ  cas de validation de la règle
│   ├── controllers/
│   │   └── eventsController.ts  # MODIFIÉ  propagation dans toCalendarEvent / putEvent
│   ├── app.test.ts              # MODIFIÉ  cycle HTTP complet via supertest
│   ├── routes/events.ts         # INCHANGÉ aucune route nouvelle
│   └── services/eventsStore.ts  # INCHANGÉ
└── data/events.json             # schéma étendu, compatible ascendant

frontend/
├── src/
│   ├── api/types.ts             # MODIFIÉ  CalendarEvent + RecurrenceRule + EventOccurrence
│   ├── composables/
│   │   ├── useRecurrence.ts     # NOUVEAU  fonctions pures, seul calcul de dates
│   │   ├── useRecurrence.test.ts # NOUVEAU  priorité de test (cf. NFR-013)
│   │   └── useCalendarGrid.ts   # INCHANGÉ eventOccursOnDay réutilisé tel quel
│   ├── stores/
│   │   ├── calendar.ts          # MODIFIÉ  occurrencesIn ajouté, filteredEvents SUPPRIMÉ
│   │   ├── calendar.test.ts     # MODIFIÉ  tests de filteredEvents réécrits
│   │   └── events.ts            # MODIFIÉ  actions de portée (série / occurrence)
│   ├── components/
│   │   ├── EventModal.vue       # MODIFIÉ  bloc Récurrence + sélecteur de portée
│   │   ├── ConfirmDialog.vue    # INCHANGÉ réutilisé, seul son message varie
│   │   ├── ui/Icon.vue          # MODIFIÉ  une entrée `repeat` dans PATHS
│   │   └── views/
│   │       ├── MonthView.vue    # MODIFIÉ  occurrencesIn + repère visuel
│   │       ├── ListView.vue     # MODIFIÉ  idem
│   │       └── TimeGrid.vue     # MODIFIÉ  idem, 2 appels fondus en 1 computed
│   └── styles/components/       # MODIFIÉ  styles du fieldset et du repère (ITCSS)
└── (DayView.vue, WeekView.vue)  # INCHANGÉS délèguent à TimeGrid

e2e/
└── tests/recurrence.spec.ts     # NOUVEAU  sélecteurs de rôle/libellé uniquement

DESIGN.md                        # MODIFIÉ  obligatoire avant commit (principe V)
```

**Structure Decision**: structure existante à trois paquets npm indépendants,
conservée sans ajout de paquet ni de couche. Le seul fichier de logique nouveau
est `frontend/src/composables/useRecurrence.ts`, placé à côté de
`useCalendarGrid.ts` dont il reprend exactement le moule (module de fonctions
pures malgré le préfixe `use`, testable sans monter de composant). Le backend ne
gagne aucun fichier.

## Complexity Tracking

> La constitution exige que toute complexité ajoutée soit justifiée. Aucun de ces
> points n'est une violation de principe ; ils sont consignés parce qu'ils
> coûtent plus cher que l'alternative naïve.

| Complexité ajoutée | Pourquoi nécessaire | Alternative plus simple rejetée parce que |
|---|---|---|
| Identifiant d'occurrence marqué (type distinct de l'identifiant d'événement) | Une occurrence n'existe pas en stockage. Sans type distinct, `eventsApi.update(occurrence.id, …)` compile et échoue en 404 au moment de l'exécution, sur un chemin rarement parcouru. | Réutiliser `CalendarEvent` pour une occurrence : moins de code, mais déplace une famille de bugs du compilateur vers la production. Coût réel de la marque : trois lignes. |
| Occurrences surchargées rattachées à leur série, plutôt qu'éclatement de la série | Permet « modifier cette occurrence seule » (FR-020, FR-021) en gardant un fichier compact et un modèle aligné sur RFC 5545 — donc réutilisable pour l'export iCal de l'issue de suivi. | Matérialiser la série en N événements dès la première exception : plus simple à lire, mais `events.json` gonfle, la notion de série est perdue, et « modifier toute la série » redevient impossible après la première exception. |
| Plafond de 500 occurrences | La recherche plein texte parcourt toutes les dates (`calendar.ts:47`). Sans borne, un `until` lointain — y compris dans un fichier édité à la main — fige le rendu. | Ne pas borner : la date de fin obligatoire empêche l'infini en saisie, mais pas une saisie à plusieurs siècles ni un fichier modifié hors de l'application. |
| Suppression de `filteredEvents` plutôt que coexistence avec `occurrencesIn` | Deux accesseurs obligeraient chaque vue à fusionner deux listes, soit la même duplication répétée quatre fois (NFR-004). | Garder les deux : aucun fichier à toucher dans l'immédiat, au prix d'un accesseur mort et de quatre fusions à maintenir. |

## Phase 0 & Phase 1

Terminées. Voir [research.md](./research.md), [data-model.md](./data-model.md),
[contracts/](./contracts/) et [quickstart.md](./quickstart.md).

**Re-contrôle de la constitution après conception** : aucun principe ne bascule.
La conception n'a introduit ni dépendance, ni route, ni fichier backend, ni jeton
de design. Le point conditionnel du principe V (mise à jour de `DESIGN.md`) reste
le seul élément à tenir, et `/speckit-tasks` doit en faire une tâche bloquante.
