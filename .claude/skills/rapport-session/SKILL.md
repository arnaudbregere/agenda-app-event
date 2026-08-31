---
name: rapport-session
description: Rédige un rapport de fin de session de travail sur ce projet, au format RAPPORT-SESSION-*.md déjà utilisé dans le dépôt. À utiliser quand l'utilisateur demande de documenter, résumer ou faire un rapport de la session en cours (ou d'une session passée qu'il décrit).
---

Rédige un rapport de session à la racine du dépôt, nommé
`RAPPORT-SESSION-YYYY-MM-DD_HH-MM-SS.md` (date/heure du moment de la
rédaction, obtenues via `date +"%Y-%m-%d_%H-%M-%S"` — ne jamais deviner
l'horodatage).

## Avant d'écrire

1. Liste les rapports existants (`RAPPORT-SESSION-*.md` à la racine) et
   repère le plus récent : le nouveau rapport doit le lier en "Contexte".
2. Relis ce que la session en cours a réellement produit (commits, PRs,
   fichiers modifiés, décisions prises) — le rapport documente des faits,
   pas des intentions.

## Structure à suivre

```markdown
# Rapport de session — <nom du projet>

**Date :** JJ/MM/AAAA
**Projet :** `<nom-du-repo>`
**Dépôt GitHub :** <url>

---

## Contexte

Suite de la session du JJ/MM/AAAA ([RAPPORT-SESSION-....md](./RAPPORT-SESSION-....md)) : <état hérité en une phrase>.

---

## 1. <Sujet traité>

<Ce qui a été fait, en phrases courtes ou listes à puces. Citer les hash
de commit entre backticks (`abc1234`) et les liens PR/issue quand ils
existent.>

## 2. <Sujet suivant>

...

---

## N. État actuel du projet

- Où en est `main` (dernier commit, protégée ou non).
- Ce qui est mergé / déployé / testé.
- Ce qui reste en attente côté utilisateur.

## N+1. Prochaines étapes suggérées

1. ...
2. ...
```

## Règles

- **Un tableau symptôme / cause / correction** pour chaque bug non trivial
  corrigé pendant la session (voir les rapports précédents pour le format
  exact) — surtout utile quand plusieurs pistes ont été explorées avant de
  trouver la vraie cause : dire ce qui n'a pas marché est aussi informatif
  que la solution finale.
- **Ton factuel et dense** : ce qui a été fait, pourquoi, avec quel
  résultat vérifié. Pas de tournures commerciales ("nous sommes ravis
  de..."), pas de remplissage.
- **Citer les preuves**, pas juste les conclusions : hash de commit,
  numéro de PR, résultat de tests (ex. "42/42 tests passent"), URL de
  vérification (ex. `/api/health` renvoyant le bon commit).
- Ne pas lister de tâche comme faite si elle n'a pas été vérifiée
  pendant la session.

## Avant de committer

**Toujours montrer le rapport rédigé à l'utilisateur et attendre sa
validation explicite avant de committer.** Ne jamais committer/pousser
un rapport sans confirmation.

Une fois validé : `main` est protégée sur ce dépôt (voir
`RAPPORT-SESSION-2026-08-31_*.md`, section 2) — donc pas de push direct.
Suivre le flux habituel :

```bash
git checkout -b docs/rapport-session-<date>
git add RAPPORT-SESSION-*.md
git commit -m "Ajoute le rapport de session du JJ/MM/AAAA"
git push -u origin docs/rapport-session-<date>
gh pr create --title "Ajoute le rapport de session du JJ/MM/AAAA" --body "..."
# attendre que les checks (Tests) passent, puis :
gh pr merge --squash --delete-branch
```
