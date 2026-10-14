# Phase 1 — Modèle de données : Événements récurrents

**Date** : 2026-10-14 · **Feature** : [spec.md](./spec.md) · **Recherche** : [research.md](./research.md)

Le stockage reste `backend/data/events.json` : un tableau JSON plat d'événements.
Trois attributs optionnels s'ajoutent au schéma. `eventsStore.ts` n'est pas
modifié. Aucune migration : un événement sans ces attributs reste valide et se
comporte comme aujourd'hui.

Ce fichier satisfait l'exigence du principe I de la constitution — « pas de schéma
implicite non documenté ».

---

## Attributs ajoutés

```jsonc
{
  "id": "…", "title": "…", "start": "…", "end": "…", "allDay": false,
  // … attributs existants inchangés …

  // 1. La règle de répétition. Absente = événement simple.
  "recurrence": {
    "freq": "weekly",            // "daily" | "weekly" | "monthly"
    "interval": 1,               // entier, 1 à 99
    "until": "2026-12-31T22:59:59.000Z"  // ISO, obligatoire
  },

  // 2. Dates d'occurrences retirées de la série. Absent = aucune exclusion.
  "exdates": ["2026-11-02T08:00:00.000Z"],

  // 3. Rattachement d'une occurrence surchargée à sa série.
  "recurrenceParentId": "…",     // id de la série
  "recurrenceId": "…"            // date de l'occurrence remplacée (ISO)
}
```

Les trois groupes sont **mutuellement exclusifs par usage** : un enregistrement
porte `recurrence` (+ éventuellement `exdates`), **ou** le couple
`recurrenceParentId` / `recurrenceId`, **jamais les deux**.

---

## Entités

### Série

Un événement ordinaire qui porte en plus `recurrence`, et éventuellement
`exdates`. Ses attributs `start` / `end` sont l'**ancre** de la série : la date et
l'heure de sa première occurrence, et la base de tous les calculs (voir R-002).

### Règle de répétition (`recurrence`)

| Attribut | Type | Règle |
|---|---|---|
| `freq` | `"daily" \| "weekly" \| "monthly"` | exactement ces trois valeurs, casse exacte |
| `interval` | entier | 1 à 99 inclus |
| `until` | chaîne ISO | obligatoire, ≥ `start` de la série |

Ne contient aucune date d'occurrence explicite.

### Occurrence

**Calculée, jamais stockée.** N'existe qu'en mémoire du frontend, produite par le
module de développement.

| Attribut | Origine |
|---|---|
| `id` | dérivé — `${seriesId}:${occurrenceStart}`, chaîne marquée (type distinct) |
| `seriesId` | l'identifiant de la série dont elle vient |
| `occurrenceStart` | sa propre date de départ, en ISO |
| `start` / `end` | décalés depuis l'ancre, en conservant la durée de l'ancre |
| tous les autres | copiés de la série |

`id` ne sert qu'aux clés de template. **Rien ne le réanalyse** : `seriesId` et
`occurrenceStart` sont de vrais attributs, c'est eux qu'on lit.

Un événement simple traverse le module et en ressort tel quel, avec `seriesId`
égal à son propre identifiant et `occurrenceStart` égal à son `start` (NFR-002 :
les vues ne distinguent jamais les deux cas).

### Exclusion (`exdates`)

Liste de dates ISO portée par la série. Chaque entrée retire l'occurrence de cette
date du résultat du développement.

Le backend ne valide que le **format ISO** de chaque entrée, pas sa correspondance
avec une occurrence réelle (R-006). Une exclusion orpheline n'exclut rien et ne
produit aucune erreur — propriété à tester explicitement.

### Occurrence surchargée

Un événement **stocké normalement**, sans `recurrence`, portant
`recurrenceParentId` (sa série) et `recurrenceId` (la date de l'occurrence qu'il
remplace).

---

## Invariants

Ces règles tiennent le modèle. Les violer produit des doublons d'affichage ou des
occurrences fantômes.

- **INV-1** — Créer une occurrence surchargée ajoute **toujours** sa date aux
  `exdates` de la série, dans la même opération. C'est ce qui rend le modèle
  simple : le module de développement n'a **pas** à connaître les surcharges. Il
  exclut la date, et la surcharge apparaît d'elle-même comme un événement
  ordinaire. Sans `exdates`, la date porterait deux événements.
- **INV-2** — Une occurrence surchargée ne porte **jamais** `recurrence`. Sinon
  elle se développerait à son tour.
- **INV-3** — Un enregistrement ne porte jamais à la fois `recurrence` et
  `recurrenceParentId`.
- **INV-4** — `until` ≥ `start` de la série.

> ⚠️ **Portée réelle de la vérification de INV-3 et INV-4.** La validation ne
> voit que le **corps** de la requête, jamais l'enregistrement stocké
> (`requireEvent` charge l'événement pour renvoyer `404` mais ne l'attache pas à
> la requête). Trois états violant ces invariants sont donc atteignables par un
> `PUT` partiel :
>
> | Requête | État obtenu |
> |---|---|
> | `PUT { start, recurrence }` sur un enregistrement stockant `recurrenceParentId` | une surcharge porteuse d'une règle — doublon d'affichage |
> | `PUT { recurrenceParentId }` sur une série stockée | même état, par l'autre bout |
> | `PUT { start }` seul sur une série, avec `start > until` stocké | série à zéro occurrence, sans erreur |
>
> Les fermer demanderait d'attacher l'événement chargé dans `requireEvent`, donc
> de modifier un middleware et le typage du routeur typé. Non fait : aucun de ces
> trois états n'est atteignable par l'interface une fois la user story 2 livrée
> (les dates d'une série y passent en lecture seule), et le coût dépasse le
> risque pour un dépôt mono-utilisateur. À rouvrir si l'API devient publique.
- **INV-5** — Supprimer une série supprime aussi tous les enregistrements dont
  `recurrenceParentId` vaut son identifiant (FR-022).
- **INV-6** — Retirer `recurrence` d'une série (FR-023) supprime aussi ses
  `exdates` et ses occurrences surchargées : elles n'ont plus de référent.

---

## Transitions d'état

| Action de l'utilisateur | Effet sur les données |
|---|---|
| Créer une série | 1 enregistrement avec `recurrence` |
| Modifier la série (portée série) | `title`, `description`, `location`, `category` et l'heure de l'ancre sont mis à jour sur la série **et** propagés à ses occurrences surchargées. Les **dates** ne changent pas (FR-019). |
| Supprimer la série (portée série) | l'enregistrement de la série **et** toutes ses surcharges sont supprimés (INV-5) |
| Supprimer une occurrence (portée occurrence) | sa date est ajoutée aux `exdates` de la série. Si cette date portait une surcharge, la surcharge est supprimée. |
| Modifier une occurrence (portée occurrence) | une surcharge est créée (ou mise à jour), et la date est ajoutée aux `exdates` (INV-1) |
| Décocher « Événement récurrent » | `recurrence`, `exdates` et les surcharges disparaissent (INV-6). Il reste un événement simple à l'ancre. |

**Note sur la propagation aux surcharges** : c'est une boucle sur un tableau
presque toujours vide. Elle évite l'incohérence visible où une série renommée
laisse une occurrence portant l'ancien titre — ce qui se lit comme un bug. Les
dates de la surcharge, elles, sont préservées : c'est tout l'objet de la
surcharge (FR-021, scénario US4-2).

---

## Règles de validation (frontière HTTP)

Dans `backend/src/utils/validators.ts` uniquement, via `withBody`. Aucun calcul de
dates (NFR-001, R-005).

| Condition | Réponse |
|---|---|
| `recurrence` absent | accepté — événement simple |
| `recurrence` n'est pas un objet | `400` |
| `freq` hors de l'énumération, ou casse différente | `400`, message listant les valeurs admises |
| `interval` non entier, < 1 ou > 99 | `400` |
| `until` absent ou non ISO | `400` |
| `until` < `start` | `400` |
| **`recurrence` présent sans `start` dans le même corps** | `400` |
| `exdates` n'est pas un tableau de chaînes ISO | `400` |
| `exdates` contenant une date ne correspondant à aucune occurrence | **accepté** (R-006) |
| `recurrence` **et** `recurrenceParentId` fournis ensemble | `400` — INV-3 |
| `recurrenceParentId` ou `recurrenceId` non chaîne, ou chaîne vide | `400` |
| `recurrence`, `exdates`, `recurrenceParentId` ou `recurrenceId` à `null` | **accepté** — demande de retrait, voir ci-dessous |
| nombre d'occurrences résultant de la règle | **non vérifié** — le plafond est une borne d'affichage (R-005) |

Format d'erreur inchangé : `{ errors: [...] }`, comme la validation de corps
existante.

### `null` = retrait, et la séparation de types qu'il impose

FR-023 (décocher « Événement récurrent ») n'avait aucun chemin : `putEvent`
n'applique que les attributs **présents** dans le corps, donc rien ne pouvait
jamais faire disparaître `recurrence`.

Résolution retenue : `null` sur le fil signifie « retirer cet attribut », absent
signifie « ne pas y toucher ». La sémantique est **symétrique sur les quatre
attributs** — sans `recurrenceParentId: null`, une occurrence surchargée ne
pourrait jamais redevenir un événement simple, et une faute de frappe du client
passerait inaperçue. `putEvent` traduit `null` en `undefined` dans le
correctif ; le spread de `updateEvent` écrase la valeur stockée, et
`JSON.stringify` omet ensuite la clé. **Le fichier ne contient donc jamais
`null`.** Un seul appel, atomique, et l'identifiant de l'événement est préservé —
contrairement à un parcours « supprimer puis recréer ».

Cela a mis au jour une confusion préexistante : `EventPatch` servait **à la fois**
de type du corps HTTP et de type du correctif de stockage. Les deux divergent
maintenant, et sont séparés :

| Type | Rôle | `null` admis ? |
|---|---|---|
| `EventPatchBody` (`types.ts`) | corps d'un `PUT` validé, ce que renvoie `parseEventPatch` | oui, sur `recurrence` et `exdates` |
| `EventPatch` (`types.ts`) | correctif passé à `eventsStore.updateEvent` | non — le stockage n'a jamais de `null` |

### Pourquoi « `recurrence` sans `start` » est refusé

`requireEvent` (`backend/src/middleware/requireEvent.ts:8`) charge l'événement
pour renvoyer `404`, mais **ne l'attache pas** à la requête. `parseEventPatch` n'a
donc pas accès au `start` stocké, et ne pourrait pas vérifier INV-4 sur une mise
à jour partielle qui ne porterait que `recurrence.until`.

Deux issues possibles : attacher l'événement à la requête (modifie un middleware
et le typage du routeur typé), ou exiger que tout corps contenant `recurrence`
contienne aussi `start`. La seconde est retenue : elle se vérifie à la frontière
sans aucun accès au stockage, ne touche ni middleware ni routeur, et le frontend
envoie déjà le formulaire complet à l'enregistrement.

---

## Déclarations de type à tenir synchronisées

Ajouter un attribut demande de le déclarer en **trois** endroits côté backend :

| Fichier | Déclaration |
|---|---|
| `backend/src/types.ts:6` | `CalendarEvent` |
| `backend/src/types.ts:22` | `EventBody` |
| `backend/src/utils/validators.ts:8` | `type Fields` |

`EventPatch` (`backend/src/types.ts:32`) dérive de `CalendarEvent` et suit seul.

⚠️ Cette triplication est **préexistante**, pas introduite par cette
fonctionnalité. Elle est signalée pour qu'aucune des trois ne soit oubliée. **Ne
pas la refactoriser dans cette PR** — hors périmètre explicite de la
spécification.

Côté frontend, une seule déclaration : `CalendarEvent` dans
`frontend/src/api/types.ts:10`. `EventInput` et `EventPatch` (lignes 23 et 25) en
dérivent par `Omit` / `Partial`.

---

## Exemple complet

Série hebdomadaire du lundi 19 octobre au 30 novembre 2026, 9h–10h. Le lundi
2 novembre est supprimé ; le lundi 9 novembre est décalé à 14h.

```json
[
  {
    "id": "a1",
    "title": "Réunion équipe",
    "start": "2026-10-19T07:00:00.000Z",
    "end": "2026-10-19T08:00:00.000Z",
    "allDay": false,
    "category": "travail",
    "recurrence": { "freq": "weekly", "interval": 1, "until": "2026-11-30T22:59:59.000Z" },
    "exdates": ["2026-11-02T08:00:00.000Z", "2026-11-09T08:00:00.000Z"],
    "createdAt": "2026-10-14T09:00:00.000Z",
    "updatedAt": "2026-10-14T09:00:00.000Z"
  },
  {
    "id": "b2",
    "title": "Réunion équipe",
    "start": "2026-11-09T13:00:00.000Z",
    "end": "2026-11-09T14:00:00.000Z",
    "allDay": false,
    "category": "travail",
    "recurrenceParentId": "a1",
    "recurrenceId": "2026-11-09T08:00:00.000Z",
    "createdAt": "2026-10-14T09:05:00.000Z",
    "updatedAt": "2026-10-14T09:05:00.000Z"
  }
]
```

Deux enregistrements pour sept occurrences affichées (19, 26 octobre ; 16, 23,
30 novembre depuis la série ; 9 novembre depuis la surcharge ; 2 novembre exclu).

Les deux dates dans `exdates` illustrent INV-1 : le 2 novembre est exclu parce
qu'il est supprimé, le 9 novembre parce qu'il est **remplacé** par `b2`. Sans
cette seconde exclusion, le 9 novembre afficherait deux événements.

Noter le décalage horaire des valeurs ISO : `07:00Z` correspond à 9h locales en
heure d'été, `08:00Z` à 9h locales en heure d'hiver. C'est le résultat attendu de
R-003 — l'heure murale est préservée, pas l'instant UTC.
