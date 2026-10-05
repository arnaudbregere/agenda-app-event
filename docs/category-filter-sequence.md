# Séquence : filtre par catégorie

Requête `GET /api/events?category=<id>` (feature `001-events-category-filter`, PR #84).

```mermaid
sequenceDiagram
    autonumber
    participant C as Client (navigateur, script)
    participant R as routes/events.ts
    participant Q as withQuery (middleware)
    participant P as parseCategoryQuery (validators)
    participant G as getEvents (controller)
    participant S as eventsStore

    C->>R: GET /api/events?category=travail
    R->>Q: route GET "/"
    Q->>P: parse(req.query)
    alt valeur valide, vide ou absente
        P-->>Q: ok, value (category ou {})
        Q->>G: handler avec req.query typé
        G->>S: listEvents()
        S-->>G: tous les événements
        G->>G: filter sur category (sans filtre : liste complète)
        G-->>C: 200 JSON
    else valeur inconnue, casse différente, vide ou répétée
        P-->>Q: erreur
        Q-->>C: 400 { "errors": ["..."] }
    end
```

## Règles

- Valeurs admises : `personnel`, `travail`, `important`, `famille`, `loisirs`, `autre` (`CATEGORY_IDS`).
- Sans paramètre : même contenu et même ordre qu'avant.
- Événement sans catégorie stockée : rattaché à `autre`.
