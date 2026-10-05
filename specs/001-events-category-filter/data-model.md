# Data model : filtre par catégorie

Aucune nouvelle entité ni champ. Référence : `CalendarEvent` (`backend/src/types.ts`).

## Paramètre de requête

| Nom | Type | Obligatoire | Valeurs admises |
|-----|------|-------------|-----------------|
| `category` | chaîne | non | `personnel`, `travail`, `important`, `famille`, `loisirs`, `autre` |

## Règle de rattachement

Un événement sans `category` stockée est traité comme `autre` (spec, Edge Cases).
