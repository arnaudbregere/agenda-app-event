# Contrat HTTP — API événements

**Feature** : [../spec.md](../spec.md) · **Modèle** : [../data-model.md](../data-model.md)

**Aucune route nouvelle** (NFR-006). Aucune route renommée, aucune supprimée.
`backend/src/routes/events.ts` n'est pas modifié. Seul le **corps** des événements
gagne trois attributs optionnels.

## Routes touchées

| Route | Changement |
|---|---|
| `GET /api/events` | renvoie les attributs de récurrence quand ils existent. Le développement des occurrences n'a pas lieu ici. |
| `GET /api/events?category=` | inchangé. Filtre sur la série, donc sur toutes ses occurrences. |
| `GET /api/events/:id` | renvoie les attributs de récurrence. |
| `POST /api/events` | accepte `recurrence`. |
| `PUT /api/events/:id` | accepte `recurrence` et `exdates`. |
| `DELETE /api/events/:id` | inchangé côté HTTP. Supprime la série ; les surcharges sont supprimées par des appels distincts du client (INV-5). |
| `GET /api/events/export` | ⚠️ inchangé — **hors périmètre**. Une série est exportée comme un événement unique non répété : perte silencieuse assumée. |
| `POST /api/events/import` | inchangé — `RRULE` toujours non développé. |
| `GET /api/health` | intouché. |

## Attributs du corps

### `recurrence` (objet, optionnel)

```jsonc
{ "freq": "daily" | "weekly" | "monthly", "interval": 1, "until": "<ISO>" }
```

- `freq` : exactement l'une des trois valeurs, casse exacte.
- `interval` : entier, 1 à 99 inclus.
- `until` : chaîne ISO valide, ≥ `start`.

### `exdates` (tableau de chaînes ISO, optionnel)

Dates d'occurrences retirées de la série. Le serveur valide le format, **pas** la
correspondance avec une occurrence réelle.

### `recurrenceParentId` et `recurrenceId` (chaînes, optionnels)

Rattachent une occurrence surchargée à sa série. Chaînes non vides. Fournis en
même temps que `recurrence` : `400` (INV-3 — une surcharge porteuse d'une règle
se développerait à son tour et doublerait l'affichage de sa propre date).

### `null` = retrait

Sur `recurrence` et `exdates`, `null` demande le retrait de l'attribut ; absent
signifie « ne pas y toucher ». C'est le chemin de FR-023, décocher
« Événement récurrent » :

```http
PUT /api/events/a1
{ "recurrence": null, "exdates": null }
```

`200`. L'événement subsiste à sa date d'ancrage, sans règle. **Le fichier stocké
ne contient jamais `null`** : l'attribut disparaît.

## Règle de corps particulière

> **Tout corps contenant `recurrence` MUST contenir aussi `start`.**
> Sinon : `400`.

Motif dans [../data-model.md](../data-model.md#pourquoi--recurrence-sans-start--est-refusé) :
`requireEvent` ne met pas l'événement chargé à disposition de la validation, qui
ne pourrait donc pas vérifier `until ≥ start` sur une mise à jour partielle.

## Réponses d'erreur

Format inchangé, cohérent avec la validation de corps existante :

```json
{ "errors": ["Le champ \"interval\" doit être un entier entre 1 et 99."] }
```

Messages en français, un par règle violée.

## Exemples

### Créer une série hebdomadaire

```http
POST /api/events
Content-Type: application/json

{
  "title": "Réunion équipe",
  "start": "2026-10-19T07:00:00.000Z",
  "end": "2026-10-19T08:00:00.000Z",
  "allDay": false,
  "category": "travail",
  "recurrence": { "freq": "weekly", "interval": 1, "until": "2026-11-30T22:59:59.000Z" }
}
```

`201` avec l'événement créé, `recurrence` incluse.

### Supprimer une occurrence seule

```http
PUT /api/events/a1
Content-Type: application/json

{ "start": "2026-10-19T07:00:00.000Z", "exdates": ["2026-11-02T08:00:00.000Z"] }
```

`200`. La série subsiste ; l'occurrence du 2 novembre n'est plus développée.

`exdates` est **remplacé**, pas fusionné : le client envoie la liste complète.
C'est le comportement de `putEvent` pour tous les attributs présents dans le
corps (`backend/src/controllers/eventsController.ts:71-91`), et l'étendre serait
une exception à justifier.

### Modifier une occurrence seule

Deux appels, non transactionnels (le stockage fichier n'offre pas de transaction) :

```http
POST /api/events          → crée la surcharge (recurrenceParentId + recurrenceId)
PUT  /api/events/a1       → ajoute la date aux exdates de la série (INV-1)
```

⚠️ Si le second échoue, la date porte **deux** événements : la surcharge et
l'occurrence calculée. Le client doit annuler la surcharge en cas d'échec. À
couvrir par un test.

### Refus : date de fin antérieure au début

```http
POST /api/events
{ "title": "x", "start": "2026-10-19T07:00:00.000Z", "end": "…",
  "recurrence": { "freq": "weekly", "interval": 1, "until": "2026-10-01T00:00:00.000Z" } }
```

```json
{ "errors": ["Le champ \"recurrence.until\" doit être postérieur ou égal à \"start\"."] }
```

## Non-engagements

Le serveur **ne garantit pas** :

- que les `exdates` correspondent à des occurrences réelles ;
- qu'une série produise moins de 500 occurrences (borne d'affichage, pas de donnée) ;
- la cohérence entre une surcharge et les `exdates` de sa série (INV-1 est tenu par le client) ;
- la suppression des surcharges lors d'un `DELETE` de la série (INV-5 est tenu par le client).

Ces quatre points sont des **choix**, pas des oublis : les garantir côté serveur
exigerait soit de développer les séries (donc de dupliquer le calcul de dates,
interdit par NFR-001), soit d'introduire des opérations transactionnelles
multi-enregistrements que le stockage fichier ne permet pas. Ils sont couverts par
les tests du frontend et par la suite de bout en bout.
