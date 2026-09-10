---
name: trello
description: CRUD sur des cartes Trello (créer, lire, modifier, déplacer, supprimer, chercher) via un script Node réutilisable — à utiliser à chaque fois qu'un board Trello doit être manipulé pour ce projet, plutôt que d'appeler l'API Trello directement.
---

Ce skill encapsule le CRUD Trello dans un script Node autonome
(`trello.mjs`, sans dépendance npm) plutôt que de faire lire les
credentials et appeler l'API Trello "à la main" à chaque demande — plus
rapide et beaucoup moins coûteux en tokens (voir
https://www.formapedia.com/topic/evitez-les-scripts-oneshot-si-un-tool-est-recurrent/).

**Ne jamais appeler `api.trello.com` directement (curl, fetch, WebFetch...)
pour du CRUD de cartes — toujours passer par ce script.**

Ce skill est dédié à `agenda-app-event` (dans `.claude/skills/`, pas
global) : il n'est disponible que dans ce dépôt.

## Pré-requis (une seule fois)

1. Copier `.claude/skills/trello/.env.example` en `.claude/skills/trello/.env`.
2. Suivre les instructions dans `.env.example` pour récupérer la clé API,
   le token et l'ID du board — étapes manuelles côté utilisateur (login
   Trello requis), je n'y ai pas accès.
3. Vérifier : `node .claude/skills/trello/trello.mjs lists` doit afficher
   les colonnes du board.

`.env` est déjà couvert par le `.gitignore` du dépôt (pattern `.env`) —
ne jamais le committer. Si `.env` est absent ou incomplet, le script
échoue explicitement en listant les variables manquantes — ne jamais
inventer ou placeholder une clé/token.

## Commandes

Exécuter depuis la racine du dépôt (`agenda-app-event/`) :

```bash
node .claude/skills/trello/trello.mjs lists
node .claude/skills/trello/trello.mjs create-list "<nom>"
node .claude/skills/trello/trello.mjs create "<titre>" [liste]
node .claude/skills/trello/trello.mjs read <id|nom>
node .claude/skills/trello/trello.mjs update <id|nom> --title="..." [--desc="..."]
node .claude/skills/trello/trello.mjs move <id|nom> <liste>
node .claude/skills/trello/trello.mjs delete <id|nom>
node .claude/skills/trello/trello.mjs find <texte>
```

- `<id|nom>` accepte soit l'id Trello (24 caractères hexa), soit un
  fragment du titre de la carte — dans ce cas le script cherche parmi
  toutes les cartes du board et demande de préciser en cas d'ambiguïté
  (plusieurs cartes correspondent).
- `create` sans liste précisée crée dans la première colonne du board —
  toujours préciser la liste explicitement si l'utilisateur en a
  mentionné une (ex. "Backlog", "À faire").
- Les noms de liste sont insensibles à la casse.

## Erreurs Trello courantes

- `HTTP 401` : clé/token invalide ou expiré → renvoyer l'utilisateur vers
  la régénération du token (voir `.env.example`).
- `HTTP 404` sur un id de carte/liste : id périmé (carte supprimée
  ailleurs) → relister (`lists` / `find`) avant de réessayer.

## Si le script ne couvre pas un besoin

Si une opération demandée ne correspond à aucune commande existante
(ex. gestion de labels, membres, checklists), ne pas improviser un appel
API brut à côté — étendre `trello.mjs` avec une nouvelle commande suivant
le même pattern (`trelloFetch`, `resolveCard`/`resolveListId`), pour que
la prochaine fois en bénéficie aussi.
