# Phase 0 — Recherche : Événements récurrents

**Date** : 2026-10-14 · **Feature** : [spec.md](./spec.md)

Les décisions de périmètre et d'architecture étaient déjà arrêtées avec l'auteur
avant `/speckit-specify` (voir la section `Clarifications` de la spécification).
Cette phase ne les rouvre pas. Elle lève les **inconnues techniques** qui
restaient, par mesure plutôt que par supposition.

Outil : sonde exécutée contre la version réellement installée (`date-fns` 4.4.0,
`frontend/node_modules`), sous `TZ=Europe/Paris`, le fuseau par défaut de
`APP_TIMEZONE`.

---

## R-001 — Écrêtage mensuel : comportement réel de `addMonths`

**Inconnue** : un 31 janvier répété mensuellement tombe-t-il au 28 février
(écrêtage) ou saute-t-il février ? Le brief supposait l'écrêtage, sans preuve.

**Mesure** :

```text
31 janvier 2027, +0 à +4 mois
+0 -> 2027-01-31   +1 -> 2027-02-28   +2 -> 2027-03-31
+3 -> 2027-04-30   +4 -> 2027-05-31

31 janvier 2028 (bissextile), +1 mois -> 2028-02-29
30 avril 2027, +1 mois -> 2027-05-30   (le 31 n'est pas « inventé »)
```

**Décision** : adopter l'écrêtage natif de `addMonths`, sans correction. Février
reçoit l'occurrence à son dernier jour (28, ou 29 en année bissextile), et les
mois suivants retrouvent le 31.

**Rationale** : c'est le comportement attendu par l'utilisateur d'un agenda
(l'occurrence n'est pas perdue), et il ne coûte aucune ligne. Le confirmer par
mesure évite de documenter un comportement supposé qui serait faux.

**Alternatives écartées** :
- *Sauter les mois trop courts* : une occurrence disparaît silencieusement, l'utilisateur ne comprend pas pourquoi février est vide. Demanderait du code en plus pour un résultat pire.
- *Reporter au 1er mars* : déplace l'occurrence dans le mois suivant, ce qui casse la lecture « une occurrence par mois ».

---

## R-002 — ⚠️ Calcul depuis l'ancre, jamais en cascade

**Inconnue** : développer la série en incrémentant l'occurrence précédente
(`addMonths(précédente, interval)`) est l'écriture la plus naturelle. Est-elle
équivalente au calcul depuis l'ancre (`addMonths(ancre, i × interval)`) ?

**Mesure — elles ne sont pas équivalentes** :

```text
Série mensuelle ancrée au 31 janvier 2027

depuis l'ancre : 01-31 | 02-28 | 03-31 | 04-30 | 05-31   ✅
en cascade     : 01-31 | 02-28 | 03-28 | 04-28 | 05-28   ❌
```

**Décision** : chaque occurrence `i` **MUST** être calculée depuis l'ancre, par
`addMonths(ancre, i × interval)`, `addWeeks(ancre, i × interval)` ou
`addDays(ancre, i × interval)`. Le développeur ne réutilise jamais l'occurrence
précédente comme base.

**Rationale** : l'écrêtage est **absorbant** en cascade. Une fois ramené au 28
février, le calcul suivant part du 28 et le 31 est perdu pour toutes les
occurrences restantes. Le bug est invisible sur une série hebdomadaire ou
quotidienne, invisible aussi sur une série mensuelle qui ne commence pas un
29/30/31, et il ne se manifeste qu'à partir de la **troisième** occurrence d'une
série mensuelle ancrée en fin de mois — exactement le genre de défaut qui passe
la revue et les tests superficiels.

**Conséquence sur les tests** : le test d'écrêtage doit porter sur au moins
**quatre** occurrences consécutives. Un test à deux occurrences passe avec les
deux implémentations et ne prouve rien. À inscrire explicitement dans la tâche de
test correspondante.

**Alternatives écartées** :
- *Cascade + mémorisation du jour d'ancrage* : il faudrait reconstruire le jour voulu à chaque étape, soit réimplémenter à la main ce que le calcul depuis l'ancre donne gratuitement. Plus de code, plus de surface de bug.

---

## R-003 — Changement d'heure : `date-fns` travaille en heure locale murale

**Inconnue** : une série hebdomadaire à 9h traverse le passage à l'heure d'hiver
(Europe/Paris, 25 octobre 2026). Reste-t-elle à 9h locales, ou dérive-t-elle à 8h
ou 10h parce qu'une semaine ne fait pas exactement 168 heures ?

**Mesure** :

```text
Hebdomadaire ancré lundi 19 octobre 2026 à 9h00
+0 -> 2026-10-19 09:00   +1 -> 2026-10-26 09:00
+2 -> 2026-11-02 09:00   +3 -> 2026-11-09 09:00

Quotidien autour du 25 octobre 2026
10-23 09:00 | 10-24 09:00 | 10-25 09:00 | 10-26 09:00 | 10-27 09:00
```

**Décision** : s'appuyer sur `addDays` / `addWeeks` / `addMonths` sans aucune
correction de fuseau. Aucune arithmétique en millisecondes, nulle part.

**Rationale** : ces fonctions sont calendaires, pas horaires — elles préservent
l'heure murale locale de part et d'autre du changement. C'est exactement le
comportement attendu : « chaque lundi à 9h » veut dire 9h, pas « toutes les 168
heures ». Ajouter `7 × 24 × 3600 × 1000` ms aurait produit 8h après le 25
octobre.

**Conséquence** : le principe IV de la constitution (« calculs de dates via
`date-fns`, pas de manipulation manuelle de `Date` ») n'est pas qu'une convention
de style ici — c'est la condition de la justesse. À souligner en revue.

---

## R-004 — Un getter Pinia paramétré n'est pas mémoïsé

**Inconnue** : `occurrencesIn(from, to)` est un getter qui renvoie une fonction.
Le résultat est-il mis en cache par couple d'arguments ?

**Constat** : non. Pinia met en cache le getter (donc l'identité de la fonction
renvoyée), mais chaque appel de la fonction s'exécute intégralement. Le dépôt en
a déjà conscience : le commentaire de `frontend/src/components/views/MonthView.vue:17-19`
explique que le regroupement par jour est fait « une seule fois par rendu […]
plutôt que de refiltrer/retrier `store.filteredEvents` à chaque appel », parce
que le template appelait `eventsForDay` deux fois par cellule.

**Décision** : chaque vue appelle `occurrencesIn` **une seule fois par rendu**,
dans un `computed`, puis regroupe localement. Interdit : l'appeler dans le
template, dans une boucle, ou une fois par cellule.

**Rationale** : sans cette règle, une grille mensuelle de 42 cellules
développerait toutes les séries 42 à 84 fois par rendu. C'est ce qui objective
SC-011 (« perçu comme instantané »), que la checklist signalait comme le critère
le plus faiblement mesurable : le critère vérifiable devient « `occurrencesIn`
est appelé une fois par rendu et par vue », pas une mesure de millisecondes.

**Point d'attention d'implémentation** : `TimeGrid.vue` appelle aujourd'hui
`filteredEvents` **deux** fois (lignes 33 et 37, événements journée entière et
événements horaires). Ces deux appels doivent se fondre en un seul `computed`
partitionné ensuite, sinon la migration double le coût au lieu de le laisser
constant.

---

## R-005 — Où borner les 500 occurrences

**Inconnue** : la checklist (`checklists/requirements.md`) signalait le risque de
glisser le plafond vers la validation backend. Confirmation nécessaire.

**Décision** : le plafond vit **dans la boucle du développeur**, côté frontend.
Le backend ne compte rien.

**Rationale** : pour refuser une règle au-delà de 500 occurrences, le backend
devrait compter les occurrences, donc porter le même calcul calendaire que le
frontend — avec les pièges R-002 et R-003 à reproduire à l'identique. Ce serait
la duplication que NFR-001 interdit, dans sa forme la plus coûteuse : deux
implémentations d'une arithmétique subtile, à garder synchronisées.

Le plafond n'est d'ailleurs pas une règle de donnée : la date de fin obligatoire
suffit à empêcher l'infini à la saisie. Le plafond protège le **rendu** contre un
`until` lointain, y compris dans un `events.json` édité à la main — cas où aucune
validation d'API n'est passée.

**Alternative écartée** : *valider le compte au backend* — voir ci-dessus.
**Alternative écartée** : *pas de plafond* — la recherche plein texte parcourt
toutes les dates, un `until` à plusieurs siècles fige l'onglet.

---

## R-006 — Suppression d'une occurrence sans route nouvelle

**Inconnue** : « supprimer cette occurrence » n'est pas un `DELETE` (la série
reste). Faut-il une route dédiée ?

**Décision** : non. `PUT /api/events/:id` avec `{ exdates: [...] }` sur la série.
Et le backend valide les `exdates` **en format ISO seulement** — il ne vérifie
pas qu'une date exclue tombe sur une occurrence réelle.

**Rationale** : vérifier la correspondance exigerait de développer la série côté
backend, donc de dupliquer le calcul (NFR-001 à nouveau). Une exclusion orpheline
n'exclut rien : elle est inoffensive, et c'est une propriété à tester explicitement
plutôt qu'un trou à combler. `putEvent` applique déjà les correctifs partiels
champ par champ (`eventsController.ts:71-91`), le motif existe.

**Alternatives écartées** :
- `DELETE /api/events/:id/occurrences/:date` : expressif, mais ajoute une route, un contrôleur, un test de route, et surtout la tentation de valider la date côté serveur.
- *Stocker les exclusions dans une collection séparée* : un second fichier à écrire de façon atomique, alors que `eventsStore.ts` sérialise déjà les écritures sur un seul fichier.

---

## Synthèse des inconnues

| Référence | Inconnue | Résolue par | Statut |
|---|---|---|---|
| R-001 | Écrêtage mensuel | mesure | ✅ écrêtage natif adopté |
| R-002 | Ancre contre cascade | mesure | ✅ **depuis l'ancre, impérativement** |
| R-003 | Changement d'heure | mesure | ✅ heure murale préservée, aucune correction |
| R-004 | Mémoïsation du getter | lecture du code existant | ✅ un appel par rendu |
| R-005 | Emplacement du plafond | raisonnement sur NFR-001 | ✅ dans le développeur |
| R-006 | Route de suppression d'occurrence | raisonnement sur NFR-001 et NFR-006 | ✅ aucune route nouvelle |

Aucune inconnue `NEEDS CLARIFICATION` ne subsiste.

## Ce que la recherche change par rapport au brief initial

1. **R-002 est une trouvaille, pas une confirmation.** Le brief ne mentionnait pas
   la différence entre calcul depuis l'ancre et calcul en cascade. C'était un bug
   latent dans l'implémentation la plus naturelle, et il exige un test à quatre
   occurrences pour être attrapé.
2. **SC-011 devient vérifiable** (R-004) : « un appel par rendu » remplace « perçu
   comme instantané ». La checklist demandait au plan de trancher ce point.
3. **R-003 requalifie le principe IV** : utiliser `date-fns` n'est plus seulement
   une convention de style sur ce périmètre, c'est la condition de la justesse.
