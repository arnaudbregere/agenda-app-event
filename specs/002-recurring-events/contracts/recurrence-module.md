# Contrat interne — module de développement des occurrences

**Fichier** : `frontend/src/composables/useRecurrence.ts`
**Feature** : [../spec.md](../spec.md) · **Recherche** : [../research.md](../research.md)

Seul endroit du dépôt où un calcul de date de récurrence est écrit (NFR-001).
Module de **fonctions pures** : aucun `ref`, aucun `computed`, aucun accès au
store, aucune lecture de l'horloge. Malgré le préfixe `use`, ce n'est pas un
composable réactif — exactement le moule de `useCalendarGrid.ts`, qui exporte
`getMonthWeeks` et `eventOccursOnDay` et se teste sans monter de composant.

## Surface publique

### `expandSeries(event, window)`

Développe un événement sur une fenêtre, et renvoie ses occurrences.

- **Entrée** : un événement stocké (série ou simple), et une fenêtre `{ from, to }`.
- **Sortie** : un tableau d'occurrences, trié par date de départ croissante.
- **Un événement sans `recurrence`** ressort en **une** occurrence identique, si et
  seulement si elle intersecte la fenêtre. C'est ce qui permet aux vues de ne
  jamais tester « est-ce une série » (NFR-002).
- **Pureté** : deux appels avec les mêmes arguments renvoient le même résultat.
  La fenêtre est toujours fournie par l'appelant, jamais déduite de `new Date()`.

### `occurrenceId(seriesId, occurrenceStart)`

Construit l'identifiant d'une occurrence. Type de retour **distinct** du type de
l'identifiant d'un événement stocké (NFR-009) : passer une occurrence à
`eventsApi.update()` doit échouer à la **compilation**.

Aucune fonction inverse n'est exposée. Rien ne réanalyse la chaîne : l'occurrence
porte `seriesId` et `occurrenceStart` comme vrais attributs.

### `MAX_OCCURRENCES`

La borne d'affichage, `500`. Exportée pour être affirmée en test, pas pour être
rendue configurable.

## Règles de calcul — contraignantes

Elles viennent de mesures, pas de préférences. Les deux premières sont des
conditions de justesse.

1. **Calcul depuis l'ancre, jamais en cascade.** L'occurrence de rang `i` se
   calcule par `addDays/addWeeks/addMonths(ancre, i × interval)`. L'occurrence
   précédente n'est **jamais** la base du calcul suivant.
   *Pourquoi* : l'écrêtage est absorbant en cascade. Mesure en [R-002](../research.md#r-002--️-calcul-depuis-lancre-jamais-en-cascade) :
   une série mensuelle ancrée au 31 janvier donne `31 | 28 | 31 | 30 | 31` depuis
   l'ancre, et `31 | 28 | 28 | 28 | 28` en cascade. Le défaut n'apparaît qu'à
   partir de la **troisième** occurrence.

2. **Aucune arithmétique en millisecondes.** Uniquement les fonctions calendaires
   de `date-fns`.
   *Pourquoi* : elles préservent l'heure murale locale au passage de l'heure d'été
   ([R-003](../research.md#r-003--date-fns-travaille-en-heure-locale-murale)).
   `+ 7 × 24 × 3600 × 1000` ferait dériver une série hebdomadaire de 9h à 8h après
   le changement d'heure.

3. **Écrêtage mensuel conservé.** Un 31 répété mensuellement tombe au dernier jour
   des mois trop courts (28, ou 29 en année bissextile). Comportement natif de
   `addMonths`, mesuré en [R-001](../research.md#r-001--écrêtage-mensuel--comportement-réel-de-addmonths).

4. **Durée préservée.** `end − start` de l'occurrence est égal à celui de l'ancre.

5. **Borne dure.** La boucle s'arrête à `MAX_OCCURRENCES`, en silence : pas
   d'exception, pas d'avertissement. Un fichier de données édité à la main avec un
   `until` lointain ne doit rien faire planter ([R-005](../research.md#r-005--où-borner-les-500-occurrences)).

6. **Exclusions appliquées après calcul.** Une date présente dans `exdates` est
   retirée du résultat. Une exclusion ne correspondant à aucune occurrence n'a
   aucun effet et ne lève rien.

7. **Les surcharges sont ignorées ici.** Le module ne connaît que `recurrence` et
   `exdates`. Une occurrence surchargée est un événement ordinaire, qui traverse
   le module par le chemin « événement simple ». C'est INV-1 (toute surcharge
   ajoute sa date aux `exdates`) qui garantit l'absence de doublon — voir
   [../data-model.md](../data-model.md#invariants).

## Point d'accès du store

### `occurrencesIn(from, to)` — `frontend/src/stores/calendar.ts`

Getter renvoyant une fonction, sur le modèle de `categoryColor`
(`frontend/src/stores/events.ts:14`). Développe tous les événements sur la
fenêtre, puis applique le filtre existant (exclusion de catégorie + recherche
plein texte), extrait **une seule fois** et consommé par ce seul accesseur
(NFR-005).

**`filteredEvents` est supprimé** (NFR-004), pas conservé en parallèle. Ses quatre
appelants migrent :

| Appelant | Fenêtre à fournir |
|---|---|
| `components/views/MonthView.vue:26` | première et dernière date de `getMonthWeeks` |
| `components/views/ListView.vue:22` | mois affiché |
| `components/views/TimeGrid.vue:33` et `:37` | jours affichés — **les deux appels se fondent en un seul `computed`** |
| `stores/calendar.ts:47` (`searchResults`) | `max(until, end)` sur les événements existants |

`stores/calendar.test.ts:119-156` est réécrit sur `occurrencesIn`.

### Règle d'appel — contraignante

> **Une vue appelle `occurrencesIn` une seule fois par rendu, dans un `computed`.**

Un getter Pinia paramétré n'est pas mémoïsé par argument : la fonction renvoyée
s'exécute entièrement à chaque appel ([R-004](../research.md#r-004--un-getter-pinia-paramétré-nest-pas-mémoïsé)).
L'appeler dans le template, dans une boucle ou une fois par cellule développerait
toutes les séries 42 à 84 fois par rendu de grille mensuelle.

Le dépôt a déjà ce réflexe, commenté à `components/views/MonthView.vue:17-19`.
C'est aussi la forme vérifiable de SC-011 : « un appel par rendu et par vue »
remplace « perçu comme instantané ».

### Fonction réutilisée, pas réécrite

L'appartenance d'une occurrence à un jour reste `eventOccursOnDay`
(`frontend/src/composables/useCalendarGrid.ts:37`). Aucune seconde implémentation
du chevauchement jour (NFR-003).

## Couverture de test attendue

`frontend/src/composables/useRecurrence.test.ts`, priorité haute (NFR-013) :

| Cas | Attendu |
|---|---|
| Événement sans `recurrence` | une occurrence, identique à l'entrée |
| Événement sans `recurrence`, hors fenêtre | aucune occurrence |
| Hebdomadaire sur 3 mois, fenêtre d'un mois | seules les occurrences du mois |
| **Mensuel ancré un 31, ≥ 4 occurrences consécutives** | `31 \| 28 \| 31 \| 30` — ⚠️ un test à 2 occurrences passe avec les deux implémentations et ne prouve rien ([R-002](../research.md#r-002--️-calcul-depuis-lancre-jamais-en-cascade)) |
| Mensuel ancré un 31 en année bissextile | 29 février |
| Hebdomadaire à 9h traversant le changement d'heure | 9h locales de part et d'autre |
| `until` égal à `start` | exactement 1 occurrence |
| `interval` de 2, 3, 99 | pas d'erreur d'arrondi de rang |
| `exdates` retirant une occurrence du milieu | les autres intactes, ordre conservé |
| `exdates` orpheline | aucun effet, aucune exception |
| `until` à plusieurs siècles | exactement `MAX_OCCURRENCES`, sans exception |
| Durée de l'ancre de 90 min | chaque occurrence dure 90 min |
| Deux appels identiques | résultats égaux (pureté) |
