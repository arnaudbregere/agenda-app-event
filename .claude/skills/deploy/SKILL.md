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

Render est connecté au repo GitHub et **redéploie automatiquement à
chaque push sur `main`** (build + restart). Il n'y a normalement **aucune
action manuelle à faire** pour déclencher un déploiement — merger une PR
sur `main` suffit.

```yaml
# render.yaml
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

Render n'expose pas de statut consultable en CLI depuis ce repo (pas de
Render CLI/API configurée ici) — la vérification se fait donc côté
symptômes observables :

1. Attendre quelques minutes (build + démarrage du service).
2. Vérifier la route de santé :
   ```bash
   curl -s https://agenda-app-event.onrender.com/api/health
   ```
3. Si besoin de confirmation visuelle du dashboard, rediriger
   l'utilisateur vers https://dashboard.render.com — je n'ai pas d'accès
   direct à ce dashboard.

## ⚠️ Limite connue : stockage non persistant (plan free)

Le disque n'est pas persistant sur le plan gratuit Render :
`backend/data/events.json` peut être réinitialisé à chaque redéploiement
ou redémarrage après une période d'inactivité. À rappeler si l'utilisateur
s'étonne de perdre des événements après un déploiement. Solution : ajouter
un [Disk Render](https://render.com/docs/disks) (plan payant requis).
