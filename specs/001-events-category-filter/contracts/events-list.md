# Contrat : GET /api/events

## Requête

`GET /api/events` avec, optionnel, `?category=<id>`.

## Réponses

| Cas | Code | Corps |
|-----|------|-------|
| Sans paramètre | 200 | tableau de tous les événements, même ordre qu'avant |
| `category` valide | 200 | tableau des seuls événements de cette catégorie (peut être vide) |
| `category` inconnue, vide, en casse différente | 400 | `{ "errors": ["..."] }` |
| `category` répétée (`?category=a&category=b`) | 400 | `{ "errors": ["..."] }` |

## Exemples

```http
GET /api/events?category=travail          → 200 [ ...événements travail ]
GET /api/events?category=Travail          → 400 { "errors": ["..."] }
GET /api/events?category=a&category=b     → 400 { "errors": ["..."] }
```

Le message d'erreur exact est défini à l'implémentation, en français, et doit nommer
les valeurs admises.
