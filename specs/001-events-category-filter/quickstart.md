# Quickstart : validation du filtre par catégorie

## Prérequis

- Dépendances installées dans `backend/` (`npm ci`).
- Fichier de données isolé : `EVENTS_DATA_FILE` pointe vers un fichier de test, jamais `backend/data/events.json`.

## Lancer le serveur de test

```bash
cd backend
EVENTS_DATA_FILE=/tmp/events-filter.json PORT=4400 npx tsx server.ts
```

## Scénarios

```bash
# Sans filtre : tous les événements
curl -s localhost:4400/api/events

# Filtre valide
curl -s "localhost:4400/api/events?category=travail"

# Valeur inconnue : 400, errors[]
curl -s -w " %{http_code}\n" "localhost:4400/api/events?category=inconnu"

# Casse différente : 400
curl -s -w " %{http_code}\n" "localhost:4400/api/events?category=Travail"

# Paramètre répété : 400
curl -s -w " %{http_code}\n" "localhost:4400/api/events?category=travail&category=famille"
```

## Tests automatisés

```bash
cd backend
npm test
npm run typecheck
```

Résultat attendu : tous les tests passent, y compris les nouveaux tests du filtre.
