# Architecture

Exports PDF : [vue d'ensemble](architecture-overview.pdf), [couches backend](architecture-layers.pdf), [CI/CD](architecture-ci.pdf).

Vue d'ensemble du système : frontend Vue 3, API Express, stockage JSON, et déploiement Render (un seul service).

## Vue d'ensemble

```mermaid
flowchart LR
    user["Navigateur"] -->|HTTPS| render["Render : service unique"]

    subgraph render_svc["Service Node (Render)"]
        express["Express (backend/src/app.ts)"]
        dist["frontend/dist (build statique)"]
        express -->|"/api/*"| api["API REST"]
        express -->|"autres routes"| dist
    end

    render --> render_svc
    api --> store["eventsStore (file de promesses)"]
    store --> json[("backend/data/events.json")]

    subgraph front["Frontend (Vue 3 + Vite + Pinia)"]
        views["Vues Mois / Semaine / Jour / Liste"]
        stores["Stores Pinia : events, calendar"]
        apiclient["frontend/src/api (fetch, VITE_API_URL)"]
        views --> stores --> apiclient
    end

    apiclient -->|"/api (prod) ou localhost:4000 (dev)"| express
```

## Backend : couches

```mermaid
flowchart TD
    req["Requête HTTP"] --> app["app.ts : cors, express.json, express.text (text/calendar)"]
    app --> routes["routes/events.ts et categories.ts"]
    routes --> mw{"Middlewares de validation"}
    mw -->|"withQuery(parseCategoryQuery)"| ctrl
    mw -->|"withBody(parseEventBody / parseEventPatch / parseIcsBody)"| ctrl
    mw -->|"requireEvent (404 avant validation)"| ctrl
    routes -->|"sans validation"| ctrl["controllers/eventsController.ts"]
    ctrl --> svc["services/eventsStore.ts"]
    svc --> data[("backend/data/events.json")]
    ctrl --> utils["utils : validators, ical, timezone, categories"]
```

## Déploiement et CI

```mermaid
flowchart LR
    pr["Pull request vers main"] --> backend["job backend : typecheck, build, test"]
    pr --> frontend["job frontend : typecheck, test"]
    backend --> e2e["job e2e : Playwright (image officielle)"]
    frontend --> e2e
    merge["Merge sur main"] --> backend2["backend"] --> e2e2["e2e"]
    merge --> frontend2["frontend"] --> e2e2
    e2e2 --> deploy["job deploy : POST /v1/services/{id}/deploys (Render)"]
    deploy --> poll["polling jusqu'à status live"]
    poll --> health["GET /api/health : commit déployé"]
```

## Lecture

- Une seule URL en prod : Express sert l'API et le build frontend.
- `events.json` : pas de base de données. Sur le plan gratuit Render, le disque n'est pas persistant.
- Les règles de couche (routes, controllers, services, validation à la frontière) sont dans `CLAUDE.md` et `.claude/rules/backend.md`.
