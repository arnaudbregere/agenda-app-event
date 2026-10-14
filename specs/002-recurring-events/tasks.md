---

description: "Task list for feature implementation"
---

# Tasks: Événements récurrents

**Input**: Design documents from `/specs/002-recurring-events/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: inclus et obligatoires. Exigés par la spécification (NFR-013, NFR-015) et par le principe VI de la constitution.

**Organization**: tâches groupées par user story, chacune livrable et testable seule.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallélisable (fichiers différents, aucune dépendance en attente)
- **[Story]**: US1 à US5, selon [spec.md](./spec.md)

## Path Conventions

Application web, trois paquets npm indépendants : `backend/src/`, `frontend/src/`, `e2e/tests/`.
Chemins réels, pris de la section Project Structure de [plan.md](./plan.md).

---

## Phase 1: Setup

**Purpose**: préparer la branche. Aucune dépendance nouvelle à installer.

- [x] T001 Créer la branche `feat/recurring-events-54` depuis un `main` à jour (`main` est protégée — aucun commit direct, voir `CLAUDE.md`)

**Checkpoint**: branche prête, arbre de travail propre.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: schéma de données, module de calcul, point d'accès unique du store.

**⚠️ CRITICAL**: aucune user story ne peut démarrer avant la fin de cette phase.

**⚠️ Propriété clé de cette phase** : elle ne produit **aucun changement visible par
l'utilisateur**. C'est un ajout de schéma plus un remaniement interne. Critère de
sortie : toutes les suites existantes restent vertes, sans modification d'un seul
test existant hors T016.

### Schéma et validation backend

- [x] T002 [P] Déclarer `RecurrenceRule` et ajouter `recurrence?`, `exdates?`, `recurrenceParentId?`, `recurrenceId?` à `CalendarEvent` (ligne 6) **et** à `EventBody` (ligne 22) dans `backend/src/types.ts`. `freq` est `"daily" | "weekly" | "monthly"` ; `interval` est un `number` ; `until` est une `string` ISO. Voir [data-model.md](./data-model.md#attributs-ajoutés)
- [x] T003 Étendre `type Fields` (ligne 8) et `readFields` dans `backend/src/utils/validators.ts` avec les règles suivantes, reprises verbatim de [data-model.md](./data-model.md#règles-de-validation-frontière-http) : `recurrence` absent → accepté ; `recurrence` non-objet → `400` ; `freq` hors des trois valeurs ou de casse différente → `400` avec message listant les valeurs admises ; `interval` non entier, `< 1` ou `> 99` → `400` ; `until` absent ou non ISO → `400` ; `until < start` → `400` ; **`recurrence` présent sans `start` dans le même corps → `400`** ; `exdates` non tableau de chaînes ISO → `400` ; `exdates` ne correspondant à aucune occurrence → **accepté**. Format d'erreur inchangé : `{ errors: [...] }`, messages en français. **Aucun calcul de date** (NFR-001) : le nombre d'occurrences n'est pas vérifié (dépend de T002)
- [x] T004 [P] Couvrir chacune des règles de T003 dans `backend/src/utils/validators.test.ts`, y compris les deux cas d'acceptation (`recurrence` absent, `exdates` orpheline)
- [x] T005 Propager les quatre attributs dans `toCalendarEvent` (ligne 30) et `putEvent` (ligne 71) de `backend/src/controllers/eventsController.ts`, en suivant le motif existant « seuls les champs présents dans le corps sont mis à jour ». `exdates` est **remplacé**, pas fusionné (voir [contracts/events-api.md](./contracts/events-api.md#supprimer-une-occurrence-seule)) (dépend de T003)
- [x] T006 [P] Ajouter à `backend/src/app.test.ts` un aller-retour HTTP complet via `supertest` : création d'une série, relecture, puis assertion que le fichier simulé contient **une seule** entrée — aucune occurrence matérialisée (FR-006)

### Types et module de calcul frontend

- [x] T007 [P] Déclarer dans `frontend/src/api/types.ts` : `RecurrenceRule`, un type `OccurrenceId` **marqué** (chaîne brandée) et `EventOccurrence` (attributs `id: OccurrenceId`, `seriesId`, `occurrenceStart`, plus ceux de `CalendarEvent`). Ajouter les quatre attributs de récurrence à `CalendarEvent` (ligne 10) — `EventInput` et `EventPatch` (lignes 23 et 25) en dérivent seuls. Objectif vérifiable : passer un `EventOccurrence["id"]` à `eventsApi.update()` **ne compile pas** (NFR-009)
- [x] T008 Écrire `frontend/src/composables/useRecurrence.test.ts` **avant** l'implémentation, et vérifier que les tests échouent. Couvrir les 13 cas du tableau de [contracts/recurrence-module.md](./contracts/recurrence-module.md#couverture-de-test-attendue). ⚠️ **Le test d'écrêtage mensuel porte sur au moins QUATRE occurrences consécutives** et attend `31 | 28 | 31 | 30` : un test à deux occurrences passe aussi avec l'implémentation fautive en cascade et ne prouve rien (voir [R-002](./research.md#r-002--️-calcul-depuis-lancre-jamais-en-cascade)) (dépend de T007)
- [x] T009 Implémenter `frontend/src/composables/useRecurrence.ts` : `expandSeries(event, { from, to })`, `occurrenceId(seriesId, occurrenceStart)`, `MAX_OCCURRENCES = 500`. Fonctions **pures** — aucun `ref`, aucun `computed`, aucun accès au store, aucune lecture de `new Date()`. Même moule que `useCalendarGrid.ts`. Les 7 règles de calcul de [contracts/recurrence-module.md](./contracts/recurrence-module.md#règles-de-calcul--contraignantes) sont contraignantes, en particulier : calcul **depuis l'ancre** par `addDays/addWeeks/addMonths(ancre, i × interval)` et **jamais** en cascade ; aucune arithmétique en millisecondes ; un événement sans `recurrence` ressort en une occurrence identique (NFR-002) ; les surcharges sont ignorées ici (INV-1 s'en charge). Fait passer T008

### Point d'accès unique du store, et suppression de l'ancien

- [x] T010 Dans `frontend/src/stores/calendar.ts` : extraire **une seule fois** le prédicat de filtrage actuel (exclusion de catégorie + recherche plein texte, lignes 31-42) et ajouter le getter-factory `occurrencesIn(from: Date, to: Date)` qui développe via `expandSeries` puis applique ce prédicat. Modèle de getter renvoyant une fonction : `categoryColor` dans `frontend/src/stores/events.ts:14` (dépend de T009)
- [x] T011 [P] Migrer `frontend/src/components/views/MonthView.vue:26` de `store.filteredEvents` vers `store.occurrencesIn(...)`, fenêtre = première et dernière date de `getMonthWeeks`. Conserver le regroupement en `Map` déjà en place (commentaire lignes 17-19) : **un seul appel par rendu** (dépend de T010)
- [x] T012 [P] Migrer `frontend/src/components/views/ListView.vue:22`, fenêtre = mois affiché, un seul appel dans un `computed` (dépend de T010)
- [x] T013 [P] Migrer `frontend/src/components/views/TimeGrid.vue` et **fondre les deux appels des lignes 33 et 37 en un seul `computed`** partitionné ensuite entre journée entière et horaires. Sans cette fusion, la migration double le coût au lieu de le laisser constant (voir [R-004](./research.md#r-004--un-getter-pinia-paramétré-nest-pas-mémoïsé)) (dépend de T010)
- [x] T014 Réécrire `searchResults` (`frontend/src/stores/calendar.ts:47`) sur `occurrencesIn`, fenêtre = `max(until, end)` sur les événements existants — un `reduce` sur un attribut stocké, pas du calcul de récurrence (dépend de T010)
- [x] T015 **Supprimer** le getter `filteredEvents` de `frontend/src/stores/calendar.ts:30`. Suppression, pas conservation en parallèle (NFR-004) (dépend de T011, T012, T013, T014)
- [x] T016 Réécrire `frontend/src/stores/calendar.test.ts:119-156` (les deux `describe` `filteredEvents` et `searchResults`) sur `occurrencesIn`, en ajoutant un cas de fenêtre qui exclut des occurrences (dépend de T015)
- [x] T017 Vérifier `grep -rn "filteredEvents" frontend/src e2e/tests` → **aucun résultat attendu**. Un résultat signifie un appelant oublié ou le getter laissé en place (dépend de T016)

### Raccordement de la modale, imposé par le type marqué

> Ces trois tâches sont les erreurs de compilation que `OccurrenceId` provoque dès
> que les vues passent des occurrences à `openEditModal`. C'est NFR-009 qui fait
> son travail : le compilateur refuse d'envoyer une occurrence à l'API.

- [x] T018 Dans `frontend/src/stores/calendar.ts` : faire accepter `EventOccurrence` par l'état `editingEvent` (ligne 22) et par l'action `openEditModal` (ligne 90) (dépend de T007, T015)
- [x] T019 Dans `frontend/src/stores/events.ts` : faire porter les actions `updateEvent` et `deleteEvent` sur un identifiant de série, jamais sur un identifiant d'occurrence (dépend de T018)
- [x] T020 Dans `frontend/src/components/EventModal.vue` : faire passer `handleSubmit` (ligne 132) et `confirmDelete` (ligne 161) par l'identifiant de série au lieu de `editing.id` (dépend de T019)

**Checkpoint**: le schéma accepte la récurrence, le module de calcul est écrit et
testé, les quatre vues passent par un accesseur unique, l'ancien est supprimé.
**Aucun changement visible par l'utilisateur.** Les trois suites et les trois
`typecheck` passent.

---

## Phase 3: User Story 1 - Créer une série et la voir dans les 4 vues (Priority: P1) 🎯 MVP

**Goal**: saisir « chaque lundi jusqu'au 31 décembre » en une fois, et retrouver
l'événement à chacune de ses dates dans les quatre vues.

**Independent Test**: créer une série hebdomadaire couvrant deux mois, parcourir
les quatre vues, vérifier qu'elle apparaît à chaque date attendue et nulle part
ailleurs.

### Tests for User Story 1 ⚠️

- [ ] T021 [P] [US1] Dans `frontend/src/components/EventModal.test.ts` : cocher « Événement récurrent » révèle les champs ; « Jusqu'au » est requis ; une date de fin antérieure au début affiche une erreur en français associée au champ et n'enregistre rien ; le récapitulatif annonce le bon nombre d'occurrences
- [ ] T022 [P] [US1] Créer `e2e/tests/recurrence.spec.ts` : créer une série hebdomadaire, vérifier le nombre d'occurrences dans les vues Mois puis Liste, puis l'absence d'occurrence après la date de fin. Sélecteurs par rôle et libellé accessible uniquement — `getByRole("checkbox", { name: "Événement récurrent" })`, `getByLabel("Jusqu'au")` — **aucune classe CSS** (NFR-014, `.claude/rules/e2e.md`). Ajouter `resetEvents()` en `beforeEach`

### Implementation for User Story 1

- [ ] T023 [US1] Dans `frontend/src/components/EventModal.vue` : ajouter à l'objet `form` (ligne 19) l'état de récurrence, et la case à cocher « Événement récurrent » sous « Toute la journée », avec le motif `c-form__checkbox-row` existant. Cochée, elle révèle un `<fieldset>` + `<legend>` « Récurrence » contenant un `<select>` Fréquence, un `<input type="number" min="1" max="99" required>` intervalle et un `<input type="date" required>` « Jusqu'au ». Chaque champ porte un `<label>` associé, jamais un `placeholder` seul (RGAA 11). Contraintes HTML natives plutôt qu'un miroir JS dans `validate()` (ligne 125) : le backend reste seul propriétaire des règles, remontées via `serverError` (NFR-010)
- [ ] T024 [US1] Dans `frontend/src/components/EventModal.vue` : ajouter la ligne d'écho sous les champs — nombre d'occurrences et date de fin, exclusions déduites (FR-007). Une série dont `until` égale `start` affiche « 1 occurrence ». Calcul via `expandSeries`, pas une seconde formule (dépend de T023)
- [ ] T025 [US1] Dans `frontend/src/styles/components/_form.scss` : styles du `<fieldset>` révélé. Uniquement `--space-*`, `--radius-sm` et la typographie `caption`/`label` existantes — aucun jeton, rayon, ombre ni couleur nouveaux. Transition de révélation courte, couverte par `prefers-reduced-motion` déjà géré dans `generic/_reset.scss` (dépend de T023)
- [ ] T026 [US1] Vérifier dans `frontend/src/components/EventModal.vue` que les champs révélés entrent dans l'ordre de tabulation du piège de focus existant (`FOCUSABLE_SELECTOR`, ligne 80) et qu'aucun champ masqué n'y reste (RGAA 12.8) (dépend de T023)
- [ ] T027 [US1] **Bloquant** — documenter le `<fieldset>` révélé dans `DESIGN.md`, section Components, sous-section Inputs / Fields. Constitution principe V : les décisions de design se prennent dans `DESIGN.md`, avant le commit. Aucune entrée à ajouter au frontmatter `colors` (dépend de T025)
- [ ] T028 [US1] Lancer `/impeccable detect` sur `EventModal.vue` et `_form.scss` et corriger ce qui remonte (dépend de T025)

**Checkpoint**: US1 livrable seule. Créer et afficher une série fonctionne de bout
en bout. Modifier ou supprimer reste au comportement actuel (porte sur la série
entière par défaut, sans sélecteur).

---

## Phase 4: User Story 2 - Agir sur toute la série (Priority: P2)

**Goal**: renommer ou supprimer une série entière en un geste, et pouvoir retirer
la récurrence d'une série.

**Independent Test**: créer une série, ouvrir une occurrence, choisir « Toute la
série », renommer, vérifier que toutes les occurrences portent le nouveau titre.

### Tests for User Story 2 ⚠️

- [ ] T029 [P] [US2] Dans `frontend/src/components/EventModal.test.ts` : le sélecteur de portée est présent à l'édition d'une occurrence de série, vaut « Cette occurrence » par défaut, et est **absent** à la création comme sur un événement non récurrent (FR-018)
- [ ] T030 [P] [US2] Dans `frontend/src/stores/events.test.ts` : l'action de portée série met à jour la série **et** propage `title`, `description`, `location`, `category` à ses occurrences surchargées, sans toucher à leurs dates (FR-021). La suppression de série emporte les surcharges (INV-5)
- [ ] T031 [P] [US2] Dans `e2e/tests/recurrence.spec.ts` : renommer en portée série, vérifier toutes les occurrences ; supprimer en portée série, vérifier la disparition dans les quatre vues

### Implementation for User Story 2

- [ ] T032 [US2] Dans `frontend/src/components/EventModal.vue` : ajouter le `<fieldset>` + `<legend>` « Appliquer à » avec deux `<input type="radio">`, « Cette occurrence » (coché par défaut) et « Toute la série ». Affiché **uniquement** à l'édition d'une occurrence appartenant à une série (FR-016, FR-018)
- [ ] T033 [US2] Dans `frontend/src/components/EventModal.vue` : en portée « Toute la série », passer les champs de **date** en lecture seule et afficher le libellé expliquant que déplacer une série demande de la recréer (FR-019, scénario US2-3) (dépend de T032)
- [ ] T034 [US2] Dans `frontend/src/stores/events.ts` : action de mise à jour en portée série — patch de la série, puis propagation de `title`, `description`, `location`, `category` à ses occurrences surchargées (boucle sur un tableau presque toujours vide, voir [data-model.md](./data-model.md#transitions-détat)). Les dates des surcharges sont préservées (dépend de T032)
- [ ] T035 [US2] Dans `frontend/src/stores/events.ts` : action de suppression en portée série — supprime la série **et** tous les enregistrements dont `recurrenceParentId` vaut son identifiant (INV-5, FR-022) (dépend de T034)
- [ ] T036 [US2] Dans `frontend/src/components/EventModal.vue` : décocher « Événement récurrent » sur une série existante retire `recurrence`, `exdates` et les surcharges, laissant un événement simple à l'ancre (FR-023, INV-6) (dépend de T035)
- [ ] T037 [US2] Faire refléter la portée effective dans le message passé à `ConfirmDialog.vue` depuis `frontend/src/components/EventModal.vue:292` (FR-024). `ConfirmDialog.vue` **n'est pas modifié** — seul son message varie (dépend de T032)
- [ ] T038 [US2] Dans `frontend/src/styles/components/_form.scss` : styles du radiogroup de portée, échelles existantes uniquement (dépend de T032)
- [ ] T039 [US2] **Bloquant** — documenter le radiogroup de portée dans `DESIGN.md`, section Components (constitution principe V) (dépend de T038)

**Checkpoint**: US1 et US2 fonctionnent indépendamment. Le sélecteur de portée
existe, mais « Cette occurrence » n'a pas encore d'effet distinct — c'est US3 et
US4.

---

## Phase 5: User Story 3 - Supprimer une occurrence seule (Priority: P3)

**Goal**: retirer une occurrence d'une série sans toucher aux autres.

**Independent Test**: créer une série de 5 occurrences, en supprimer une en portée
« Cette occurrence », vérifier que les 4 autres sont intactes après rechargement.

### Tests for User Story 3 ⚠️

- [ ] T040 [P] [US3] Dans `frontend/src/stores/events.test.ts` : la suppression en portée occurrence envoie un `PUT` ajoutant la date aux `exdates`, et **aucun** `DELETE`. Si la date portait une surcharge, celle-ci est supprimée
- [ ] T041 [P] [US3] Dans `frontend/src/composables/useRecurrence.test.ts` : une série dont toutes les occurrences sont exclues ne produit aucune occurrence, sans erreur (FR, cas limite « série entièrement exclue »)
- [ ] T042 [P] [US3] Dans `e2e/tests/recurrence.spec.ts` : supprimer la 3ᵉ occurrence de 5 en portée occurrence, vérifier les 4 restantes, **recharger la page**, vérifier qu'elle est toujours absente (scénario US3-2)

### Implementation for User Story 3

- [ ] T043 [US3] Dans `frontend/src/stores/events.ts` : action de suppression en portée occurrence — `PUT /api/events/:seriesId` avec `start` et la liste **complète** des `exdates` augmentée de la date visée. `exdates` est remplacé, pas fusionné côté serveur (voir [contracts/events-api.md](./contracts/events-api.md#supprimer-une-occurrence-seule)) (dépend de T037)
- [ ] T044 [US3] Dans `frontend/src/components/EventModal.vue` : router `confirmDelete` (ligne 161) vers l'action de portée occurrence ou de portée série selon le sélecteur, et adapter le message de confirmation en conséquence (dépend de T043)

**Checkpoint**: US1 à US3 fonctionnent indépendamment.

---

## Phase 6: User Story 4 - Modifier une occurrence seule (Priority: P4)

**Goal**: décaler ou modifier une occurrence sans toucher aux autres.

**Independent Test**: décaler une occurrence d'une heure en portée « Cette
occurrence », vérifier que cette date porte le nouvel horaire et que les autres
gardent l'ancien.

### Tests for User Story 4 ⚠️

- [ ] T045 [P] [US4] Dans `frontend/src/stores/events.test.ts` : la modification en portée occurrence crée une surcharge portant `recurrenceParentId` et `recurrenceId`, **sans** `recurrence` (INV-2), **et** ajoute la date aux `exdates` de la série dans la même opération (INV-1)
- [ ] T046 [P] [US4] Dans `frontend/src/stores/events.test.ts` : ⚠️ si le second des deux appels échoue, la surcharge créée est annulée. Sans ce rattrapage, la date porterait **deux** événements (voir [contracts/events-api.md](./contracts/events-api.md#modifier-une-occurrence-seule) — le stockage fichier n'offre pas de transaction)
- [ ] T047 [P] [US4] Dans `e2e/tests/recurrence.spec.ts` : décaler une occurrence d'une heure, puis renommer **toute la série**, et vérifier que l'occurrence décalée prend le nouveau titre **en gardant** son horaire propre (scénario US4-2)

### Implementation for User Story 4

- [ ] T048 [US4] Dans `frontend/src/stores/events.ts` : action de modification en portée occurrence — `POST` de la surcharge, puis `PUT` ajoutant la date aux `exdates` (INV-1), avec annulation de la surcharge si le second appel échoue (dépend de T043)
- [ ] T049 [US4] Dans `frontend/src/components/EventModal.vue` : router `handleSubmit` (ligne 132) vers l'action de portée occurrence ou de portée série selon le sélecteur (dépend de T048)
- [ ] T050 [US4] Vérifier sur le fichier de données qu'une série amputée et surchargée produit **deux** enregistrements, pas un par occurrence — comparer à l'exemple de [data-model.md](./data-model.md#exemple-complet) (dépend de T049)

**Checkpoint**: US1 à US4 fonctionnent indépendamment. Tous les critères
d'acceptation de l'issue #54 sont couverts.

---

## Phase 7: User Story 5 - Repérer une série dans les vues (Priority: P5)

**Goal**: distinguer une occurrence d'un événement unique sans l'ouvrir.

**Independent Test**: afficher côte à côte une occurrence et un événement simple
dans chacune des quatre vues, vérifier que seul le premier porte le repère.

### Tests for User Story 5 ⚠️

- [ ] T051 [P] [US5] Dans `frontend/src/components/views/MonthView.test.ts` : seule l'occurrence porte le repère, et la pastille expose le caractère récurrent dans son `aria-label` (FR-015, RGAA 1)
- [ ] T052 [P] [US5] Dans `e2e/tests/recurrence.spec.ts` : à 360px de large en vue Mois, le repère reste visible et c'est le titre qui est tronqué ; aucun défilement horizontal (scénario US5-2, RGAA 10.5)

### Implementation for User Story 5

- [ ] T053 [P] [US5] Ajouter une entrée `repeat` au registre `PATHS` de `frontend/src/components/ui/Icon.vue:3` (tracé `viewBox="0 0 24 24"`, `stroke="currentColor"`, cohérent avec les 14 entrées existantes)
- [ ] T054 [US5] Afficher le repère dans `frontend/src/components/views/MonthView.vue`, `ListView.vue` et `TimeGrid.vue`, après l'heure et avant le titre. `Icon.vue` rend `aria-hidden="true"` : le sens est donc porté par l'`aria-label` du `<button>` de la pastille, pas par l'icône (dépend de T053)
- [ ] T055 [US5] Dans `frontend/src/styles/components/_event-pill.scss` : échelle `caption`, `flex-shrink: 0` sur le repère, `min-width: 0` + ellipsis conservés sur le titre — le titre rétrécit sans jamais pousser le repère hors de la pastille. Aucune couleur propre : le repère hérite du texte courant (`ink-muted` en vue Mois, texte inversé en vue Semaine/Jour), donc **One Accent Rule** intacte (dépend de T054)
- [ ] T056 [US5] **Bloquant** — documenter la modification de l'Event Pill dans `DESIGN.md`, section Components, sous-section « Event Pill / Event Block (signature component) ». C'est un composant signature : la modification s'y documente avant le commit (constitution principe V) (dépend de T055)
- [ ] T057 [US5] Lancer `/impeccable detect` sur les trois vues et `_event-pill.scss`, puis `/impeccable critique` — la hiérarchie du composant signature change (voir `CLAUDE.md`, section « Design et agents ») (dépend de T055)

**Checkpoint**: les cinq user stories fonctionnent indépendamment.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T058 Vérifier que `DESIGN.md` couvre bien les **trois** éléments (fieldset révélé par T027, radiogroup de portée par T039, Event Pill par T056) et qu'aucune entrée n'a été ajoutée au frontmatter `colors`
- [ ] T059 [P] Documenter dans `.claude/rules/backend.md` les quatre attributs de récurrence du schéma `events.json`, exigence du principe I (« pas de schéma implicite non documenté »), en renvoyant à [data-model.md](./data-model.md)
- [ ] T060 [P] Créer l'issue GitHub de suivi « Export / import iCal des récurrences (RRULE, EXDATE, RECURRENCE-ID) » avec `gh issue create`. ⚠️ Y écrire explicitement la perte silencieuse : jusqu'à sa résolution, `GET /api/events/export` exporte une série comme **un seul** événement non répété. Y signaler aussi que la phrase « Récurrences (RRULE) non développées à l'import » de `.claude/rules/backend.md` deviendra ambiguë dès que l'export émettra des `RRULE`, et sera à reformuler là-bas et non dans cette PR
- [ ] T061 Vérifier `grep -rn "addDays\|addWeeks\|addMonths" backend/src` → aucun résultat dans un contexte de récurrence (NFR-001). `backend/src/utils/timezone.ts:73` possède son propre `addDays` pour l'export iCal journée entière : préexistant et sans rapport
- [ ] T062 Vérifier qu'aucune vue n'appelle `occurrencesIn` dans un template, une boucle ou une fois par cellule — **un appel par rendu et par vue**. C'est la forme vérifiable de SC-011, un getter Pinia paramétré n'étant pas mémoïsé (voir [R-004](./research.md#r-004--un-getter-pinia-paramétré-nest-pas-mémoïsé))
- [ ] T063 Exécuter la section 4 de [quickstart.md](./quickstart.md#4-robustesse--fichier-de-données-hostile) — fichier de données hostile avec `until` en 2525 : l'application doit s'afficher, naviguer et chercher sans blocage ni erreur en console
- [ ] T064 Exécuter les 16 étapes du parcours manuel de [quickstart.md](./quickstart.md#3-parcours-complet-dans-lapplication), y compris l'étape 15 au clavier seul
- [ ] T065 Lancer les trois suites et les trois `typecheck` : `npm test && npm run typecheck` dans `backend/`, `frontend/` et `e2e/` (constitution principe VI — `npm test` seul ne vérifie pas les types)
- [ ] T066 Lancer l'agent `reviewer` sur le diff complet (il contrôle aussi `DESIGN.md` puisque `frontend/` est touché)
- [ ] T067 Ouvrir la PR, en mentionnant l'issue #54, l'issue de suivi de T060 et la perte silencieuse à l'export. **Présenter le diff et les résultats de vérification à l'auteur et attendre son accord explicite avant tout `git push`** (`CLAUDE.md`, section « Workflow git »)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)** : aucune dépendance
- **Phase 2 (Foundational)** : dépend de la Phase 1 — **bloque toutes les user stories**
- **Phases 3 à 7 (User Stories)** : dépendent de la fin de la Phase 2
- **Phase 8 (Polish)** : dépend des stories retenues

### User Story Dependencies

- **US1 (P1)** : après la Phase 2. Aucune dépendance sur une autre story.
- **US2 (P2)** : après la Phase 2. Introduit le sélecteur de portée, dont US3 et US4 dépendent.
- **US3 (P3)** : après la Phase 2. **Dépend du sélecteur de portée d'US2** (T032, T037).
- **US4 (P4)** : après la Phase 2. **Dépend de l'action d'exclusion d'US3** (T043), INV-1 imposant qu'une surcharge ajoute toujours sa date aux `exdates`.
- **US5 (P5)** : après la Phase 2. Totalement indépendante des autres stories — seule story réellement parallélisable avec US1.

> Les deux dépendances inter-stories (US3 → US2, US4 → US3) ne sont pas des
> défauts de découpage : elles viennent du modèle de données. Chaque story reste
> **testable** et **livrable** seule, dans cet ordre.

### Within Each User Story

- Les tests sont écrits d'abord et doivent échouer avant implémentation
- Module pur avant store, store avant composants, composants avant styles
- La tâche `DESIGN.md` de la story est **bloquante** pour sa clôture

### Parallel Opportunities

- Phase 2 : T002, T004, T006, T007 en parallèle ; puis T011, T012, T013 ensemble après T010
- Phase 3 : T021 et T022 ensemble
- Phase 4 : T029, T030, T031 ensemble
- Phase 5 : T040, T041, T042 ensemble
- Phase 6 : T045, T046, T047 ensemble
- Phase 7 : T051, T052 ensemble ; T053 parallélisable avec toute autre story
- Phase 8 : T059, T060 ensemble
- **US5 entière** peut avancer en parallèle d'US1 à US4

---

## Parallel Example: Phase 2

```bash
# Déclarations de types, indépendantes entre paquets :
Task: "T002 Déclarer RecurrenceRule dans backend/src/types.ts"
Task: "T007 Déclarer OccurrenceId et EventOccurrence dans frontend/src/api/types.ts"

# Après T010, les trois migrations de vues touchent trois fichiers distincts :
Task: "T011 Migrer MonthView.vue vers occurrencesIn"
Task: "T012 Migrer ListView.vue vers occurrencesIn"
Task: "T013 Migrer TimeGrid.vue et fondre ses deux appels en un computed"
```

---

## Implementation Strategy

### MVP (US1 seule)

1. Phase 1 : branche
2. Phase 2 : **critique**, bloque tout — se termine sans aucun changement visible
3. Phase 3 : US1
4. **ARRÊT ET VALIDATION** : créer et afficher une série fonctionne de bout en bout
5. Livrable en l'état : modifier et supprimer gardent le comportement actuel

### Livraison incrémentale

1. Phases 1 + 2 → socle prêt, comportement identique à aujourd'hui
2. + US1 → créer et afficher **(MVP)**
3. + US2 → portée série
4. + US3 → exclusion d'une occurrence
5. + US4 → surcharge d'une occurrence — l'issue #54 est alors entièrement couverte
6. + US5 → repère visuel
7. Phase 8 → vérifications transverses et PR

### Découpage en PR

Le dépôt est en solo, `main` protégée, et chaque story est livrable seule. Deux
options :

- **Une PR par incrément** (Phase 2, puis US1, …) : revues courtes, CI verte à
  chaque étape, et la Phase 2 se relit comme un remaniement sans changement de
  comportement — l'idéal pour une relecture honnête.
- **Une seule PR** : plus simple à suivre, mais ~20 fichiers et un remaniement
  mêlé à une fonctionnalité dans le même diff.

Recommandation : **au moins deux PR**, en isolant la Phase 2. Son critère de
sortie — « aucun changement visible, tous les tests existants verts » — est
exactement ce qui se vérifie mal quand un diff mélange remaniement et
fonctionnalité.

---

## Notes

- Tâches `[P]` = fichiers différents, aucune dépendance en attente
- Commit après chaque tâche ou groupe cohérent ; **aucun `git push` sans accord explicite** (`CLAUDE.md`)
- Les trois tâches `DESIGN.md` (T027, T039, T056) sont bloquantes, pas du nettoyage de fin
- ⚠️ Les tâches portant un avertissement reposent sur une mesure ou un invariant, pas sur une préférence : T008 (quatre occurrences minimum), T013 (fusion des deux appels), T046 (annulation de la surcharge), T060 (perte silencieuse à l'export)
