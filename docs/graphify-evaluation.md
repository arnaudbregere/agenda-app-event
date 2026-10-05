# Évaluation de graphify sur agenda-app-event

Issue #88. Question : graphify apporte-t-il quelque chose par rapport à `grep` pour des recherches précises dans le code ?

## Protocole

- Vérité terrain établie par `grep` avant toute requête graphify.
- Graphe AST seul : aucun token LLM. Corpus de code uniquement (`.graphifyignore` exclut `.claude/skills/`, `.github/skills/`, `.specify/`).
- Graphe : 461 nœuds, 874 arêtes, 16 communautés.
- Requêtes : `graphify query "<question>"` (mode BFS par défaut).

## Résultats

| # | Question | Vérité terrain (grep) | Réponse graphify | Verdict |
|---|---|---|---|---|
| Q1 | Où le paramètre `category` de `GET /api/events` est-il validé ? | `routes/events.ts`, `utils/validators.ts` (`parseCategoryQuery`) | `routes/events.ts` et `validateQuery.ts` ; `validators.ts` absent du top | Partiel |
| Q2 | Qui appelle `createEvents` ? | `controllers/eventsController.ts:64` | Définition de `createEvents` et ses appels internes ; l'appelant n'est pas listé | Échec |
| Q3 | Quelles routes utilisent `withBody` ? | 3 usages dans `routes/events.ts` (lignes 23 à 25) | Fichier trouvé, usages non énumérés (réponse tronquée) | Partiel |
| Q4 | Où `APP_TIMEZONE` est-il défini ? | `utils/timezone.ts:6` | `utils/timezone.ts` L6, exact (réponse de 19,9 ko pour une ligne) | Correct |
| Q5 | Quels composants frontend utilisent `useEventsStore` ? | 10 fichiers (hors tests) | 6 consommateurs visibles sur 10 (réponse tronquée) | Partiel |

Bilan : 1 correct, 3 partiels, 1 échec. Critère de réussite (4 sur 5, et moins de tokens que `grep`) non atteint.

## Observations

- **Appels par namespace non résolus** : Q2 échoue parce que `eventsController` appelle `store.createEvents(...)` via `import * as store`. L'extraction AST ne relie pas cet appel à la définition.
- **Réponses trop volumineuses** : Q4 renvoie 62 nœuds et 133 arêtes pour une seule ligne. Q3 et Q5 sont tronquées. Un `grep` donne une réponse exacte de quelques lignes.
- **Ce qui fonctionne** : vue d'ensemble (god nodes, communautés, graphe HTML). Les pivots de l'app ressortent bien (`useCalendarStore`, `useEventsStore`, `CalendarEvent`).

## Verdict

- **Retenu** : vue d'ensemble de l'architecture (graph.html, GRAPH_REPORT.md).
- **Non retenu** : recherche précise de symboles, appelants, usages. `grep` est plus exact et moins coûteux.
- **À reconsidérer** : si l'extraction gère les appels par namespace, ou si l'outil passe à une analyse sémantique (option B, coût LLM).

## Reproduire

```bash
graphify query "Who calls createEvents in the backend?"
grep -rn "createEvents(" backend/src --include=*.ts | grep -v test
```
