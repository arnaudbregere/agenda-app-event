# Research : filtre des événements par catégorie

Aucune inconnue technique. Décisions prises à partir du code existant.

## Décision 1 : source de la liste des catégories valides

- **Decision** : réutiliser `CATEGORY_IDS` (`backend/src/utils/categories.ts`).
- **Rationale** : c'est déjà la source de vérité serveur, utilisée par la validation des
  événements. Une seconde liste divergerait.
- **Alternatives** : liste codée dans la route (rejetée : duplication).

## Décision 2 : forme de l'erreur

- **Decision** : `400 { "errors": ["..."] }`.
- **Rationale** : clarification du 2026-10-05, même format que `withBody`.
- **Alternatives** : `{ "error": "..." }` (rejetée à la clarification).

## Décision 3 : emplacement de la validation du paramètre

- **Decision** : middleware `withQuery` dans `middleware/validateQuery.ts`, sur le modèle de
  `withBody`.
- **Rationale** : cohérence avec la validation du corps ; le contrôleur reçoit une valeur typée.
- **Alternatives** : parseur appelé dans le contrôleur (rejetée : mélange validation et logique).

## Décision 4 : filtrage

- **Decision** : `events.filter((e) => (e.category ?? "autre") === category)` en mémoire.
- **Rationale** : stockage JSON déjà lu en entier ; pas d'index à maintenir.
- **Alternatives** : filtrage au niveau du store (rejetée : pas de gain tant que le store lit tout le fichier).
