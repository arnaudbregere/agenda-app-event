---
name: deploy
description: Check-list et procédure de déploiement d'agenda-app-event sur Render. À utiliser quand l'utilisateur demande de déployer, vérifier un déploiement, ou en cas de doute sur l'état de prod après un merge sur main.
---

`agenda-app-event` est déployé sur **Render**, en **un seul service web**
(Blueprint, config dans `render.yaml` à la racine) : le build du
frontend (`frontend/dist`) est servi directement par le serveur Express —
une seule URL, pas de CORS à gérer en prod.

URL de prod : https://agenda-app-event.onrender.com/

## Comment fonctionne le déploiement

L'auto-deploy natif de Render est **désactivé** (`autoDeploy: false` dans
`render.yaml`). Le déploiement est piloté par le job `deploy` du workflow
`.github/workflows/tests.yml` : il se déclenche sur push `main` (donc à
chaque merge de PR), mais **seulement si les jobs `backend` et `frontend`
(tests) sont passés** — c'est le gate qui manquait avec l'auto-deploy
Render seul.

Ce job :
1. Appelle l'API Render (`POST /v1/services/{id}/deploys`) avec
   `RENDER_API_KEY` / `RENDER_SERVICE_ID` (secrets du repo GitHub).
2. Poll le statut du déploiement jusqu'à `live` (échec du job si
   `build_failed`/`update_failed`/`canceled`, ou timeout ~10 min).
3. Vérifie `GET /api/health` en tout dernier.

Donc **aucune action manuelle à faire** pour déclencher ou vérifier un
déploiement — merger une PR sur `main` suffit, et le statut du job
`deploy` dans Actions dit si ça a marché.

```yaml
# render.yaml
autoDeploy: false
buildCommand: cd frontend && npm ci && npm run build && cd ../backend && npm ci
startCommand: node backend/server.js
healthCheckPath: /api/health
```

## Avant de merger sur `main`

1. Vérifier que la CI GitHub Actions est verte sur la PR (tests backend
   **et** frontend) — `gh pr checks <numéro>`.
2. `main` est protégée : toujours passer par une PR
   (`gh pr merge --squash --delete-branch`), jamais de push direct.

## Après le merge — vérifier que le déploiement a réussi

Le job `deploy` du workflow `tests.yml` fait la vérification
automatiquement (voir ci-dessus). En cas de doute ou pour un suivi en
direct :

```bash
gh run list --workflow=tests.yml --branch=main --limit 1
gh run watch <run-id>
```

Si le job `deploy` échoue malgré des tests verts, ou pour une
confirmation visuelle, rediriger l'utilisateur vers
https://dashboard.render.com — je n'ai pas d'accès direct à ce
dashboard.

### Secrets requis (à configurer une seule fois, manuellement)

- `RENDER_API_KEY` : Render dashboard → Account Settings → API Keys.
- `RENDER_SERVICE_ID` : visible dans l'URL du service sur le dashboard
  Render (`srv-...`).

À ajouter dans GitHub : repo → Settings → Secrets and variables →
Actions. Je n'ai pas accès à ces dashboards, cette étape reste manuelle
côté utilisateur.

## ⚠️ Limite connue : stockage non persistant (plan free)

Le disque n'est pas persistant sur le plan gratuit Render :
`backend/data/events.json` peut être réinitialisé à chaque redéploiement
ou redémarrage après une période d'inactivité. À rappeler si l'utilisateur
s'étonne de perdre des événements après un déploiement. Solution : ajouter
un [Disk Render](https://render.com/docs/disks) (plan payant requis).
