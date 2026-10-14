# Quickstart : validation des événements récurrents

Guide d'exécution. Les détails de schéma sont dans
[data-model.md](./data-model.md), les contrats dans
[contracts/](./contracts/).

## Prérequis

- Dépendances installées dans `backend/`, `frontend/` et `e2e/` (`npm ci`).
- Chromium pour Playwright : `npx playwright install chromium` dans `e2e/` (une fois).
- **Fichier de données isolé** : `EVENTS_DATA_FILE` pointe toujours vers un fichier
  de test, jamais `backend/data/events.json` (constitution, principe I).

---

## 1. Validation de la règle, côté API

```bash
cd backend
EVENTS_DATA_FILE=/tmp/events-recurrence.json PORT=4400 npx tsx server.ts
```

```bash
# Série hebdomadaire valide -> 201
curl -s -w " %{http_code}\n" -X POST localhost:4400/api/events \
  -H 'Content-Type: application/json' -d '{
    "title":"Réunion équipe",
    "start":"2026-10-19T07:00:00.000Z","end":"2026-10-19T08:00:00.000Z",
    "allDay":false,"category":"travail",
    "recurrence":{"freq":"weekly","interval":1,"until":"2026-11-30T22:59:59.000Z"}}'

# Fréquence inconnue -> 400, errors[]
curl -s -w " %{http_code}\n" -X POST localhost:4400/api/events \
  -H 'Content-Type: application/json' -d '{
    "title":"x","start":"2026-10-19T07:00:00.000Z","end":"2026-10-19T08:00:00.000Z",
    "recurrence":{"freq":"yearly","interval":1,"until":"2026-11-30T22:59:59.000Z"}}'

# Casse différente ("Weekly") -> 400
# interval = 0 -> 400 ; interval = 100 -> 400 ; interval = 1.5 -> 400
# until absent -> 400
# until antérieur à start -> 400

# recurrence sans start dans le même corps -> 400
curl -s -w " %{http_code}\n" -X PUT localhost:4400/api/events/<id> \
  -H 'Content-Type: application/json' \
  -d '{"recurrence":{"freq":"daily","interval":1,"until":"2026-12-31T22:59:59.000Z"}}'

# exdate orpheline (ne correspond à aucune occurrence) -> 200, acceptée
curl -s -w " %{http_code}\n" -X PUT localhost:4400/api/events/<id> \
  -H 'Content-Type: application/json' \
  -d '{"start":"2026-10-19T07:00:00.000Z","exdates":["2030-01-01T00:00:00.000Z"]}'
```

**Attendu** : les refus renvoient `400` avec `{ "errors": [...] }` en français.
La série créée est **une seule** entrée dans `/tmp/events-recurrence.json` —
vérifier qu'aucune occurrence n'y est matérialisée :

```bash
python3 -c "import json;print(len(json.load(open('/tmp/events-recurrence.json'))))"
# attendu : 1
```

---

## 2. Développement des occurrences — le test qui compte

```bash
cd frontend
npm test -- useRecurrence
```

**Attendu** : tous les cas du tableau de
[contracts/recurrence-module.md](./contracts/recurrence-module.md#couverture-de-test-attendue)
passent.

⚠️ **Le cas décisif** est la série mensuelle ancrée un 31, sur **au moins quatre**
occurrences consécutives : `31 | 28 | 31 | 30`. Un test à deux occurrences passe
avec l'implémentation correcte *et* avec l'implémentation fautive en cascade —
il ne prouve rien. Voir [R-002](./research.md#r-002--️-calcul-depuis-lancre-jamais-en-cascade).

---

## 3. Parcours complet dans l'application

```bash
# Terminal 1
cd backend && EVENTS_DATA_FILE=/tmp/events-recurrence.json npm run dev
# Terminal 2
cd frontend && npm run dev
```

| # | Action | Attendu |
|---|---|---|
| 1 | Ouvrir « Créer », cocher « Événement récurrent » | les champs Fréquence, intervalle et « Jusqu'au » apparaissent ; « Jusqu'au » est requis |
| 2 | Hebdomadaire, intervalle 1, jusqu'au 30 novembre | le récapitulatif annonce le nombre d'occurrences et la date de fin |
| 3 | Mettre « Jusqu'au » avant la date de début | erreur en français sous le champ, rien n'est créé |
| 4 | Enregistrer, puis parcourir Mois, Semaine, Jour, Liste | l'événement apparaît à chaque lundi attendu, et à aucune autre date |
| 5 | Avancer d'un mois après la date de fin | aucune occurrence |
| 6 | Ouvrir une occurrence | le sélecteur « Appliquer à » est présent, sur « Cette occurrence » |
| 7 | Ouvrir un événement **non** récurrent | aucun sélecteur de portée |
| 8 | Supprimer une occurrence, portée « Cette occurrence », confirmer | elle seule disparaît ; le message de confirmation disait bien « cette occurrence » |
| 9 | Recharger la page | l'occurrence supprimée est toujours absente |
| 10 | Décaler une occurrence d'une heure, portée « Cette occurrence » | cette date change d'horaire, les autres non |
| 11 | Renommer, portée « Toute la série » | toutes les occurrences portent le nouveau titre, **y compris** celle décalée à l'étape 10, qui garde son horaire |
| 12 | Portée « Toute la série », regarder les champs de date | en lecture seule |
| 13 | Décocher « Événement récurrent », enregistrer | un seul événement reste, à la date d'ancrage |
| 14 | Rechercher le titre de la série | les occurrences apparaissent, y compris hors du mois affiché |
| 15 | Naviguer au clavier seul (Tab, Entrée, Échap) dans la modale | tout est atteignable, le focus reste piégé puis est restitué à la fermeture |
| 16 | Réduire à 360px de large, vue Mois | le repère de répétition reste visible, c'est le titre qui est tronqué ; aucun défilement horizontal |

**Vérification du fichier** après les étapes 8 et 10 :

```bash
cat /tmp/events-recurrence.json
```

Attendu : **deux** entrées (la série avec ses `exdates`, et la surcharge), pas
une par occurrence. Comparer à l'exemple de
[data-model.md](./data-model.md#exemple-complet).

---

## 4. Robustesse : fichier de données hostile

Le plafond est une borne d'affichage, pas une validation — il doit tenir sur un
fichier écrit à la main, qui n'est jamais passé par l'API.

```bash
cat > /tmp/events-huge.json <<'JSON'
[{"id":"x","title":"Quotidien sans fin utile",
  "start":"2026-01-01T08:00:00.000Z","end":"2026-01-01T09:00:00.000Z",
  "allDay":false,"category":"autre",
  "recurrence":{"freq":"daily","interval":1,"until":"2525-01-01T00:00:00.000Z"},
  "createdAt":"2026-01-01T00:00:00.000Z","updatedAt":"2026-01-01T00:00:00.000Z"}]
JSON
cd backend && EVENTS_DATA_FILE=/tmp/events-huge.json npm run dev
```

**Attendu** : l'application s'affiche, navigue et répond normalement. La
recherche fonctionne. Aucun blocage, aucune erreur en console.

---

## 5. Suites complètes

```bash
cd backend  && npm test && npm run typecheck
cd frontend && npm test && npm run typecheck
cd e2e      && npm test && npm run typecheck
```

**Attendu** : les trois suites et les trois vérifications de types passent
(constitution, principe VI). `npm test` seul ne suffit pas : ni Vitest ni
Playwright ne vérifient les types complètement.

### Vérification anti-code-mort

```bash
grep -rn "filteredEvents" frontend/src e2e/tests
```

**Attendu : aucun résultat.** L'accesseur est supprimé, pas conservé à côté du
nouveau (NFR-004). Un résultat signifie soit un appelant oublié, soit le getter
laissé en place.

### Vérification anti-duplication

```bash
grep -rn "addDays\|addWeeks\|addMonths" backend/src
```

**Attendu : aucun résultat** dans un contexte de récurrence. Le backend ne calcule
aucune date de récurrence (NFR-001). `backend/src/utils/timezone.ts` possède son
propre `addDays` pour l'export iCal journée entière : il est préexistant et sans
rapport.

---

## 6. Avant de proposer un commit

- [ ] `DESIGN.md` mis à jour (fieldset révélé, radiogroup de portée, modification de l'Event Pill) — **bloquant**, principe V
- [ ] `/impeccable detect` passé sur les fichiers `.vue` et `.scss` touchés
- [ ] Issue de suivi créée pour l'export/import iCal des `RRULE`, mentionnant explicitement la perte silencieuse à l'export
- [ ] Agent `reviewer` passé sur le diff
- [ ] Branche `feat/recurring-events-54`, PR ouverte, **accord explicite de l'auteur avant tout push**
