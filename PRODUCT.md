# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

L'auteur du projet lui-même, en contexte portfolio/démo : l'app est
présentée comme preuve de compétence technique (à des recruteurs, sur un
portfolio) plutôt que pensée pour un usage quotidien par des tiers. Pas
d'authentification multi-utilisateur prévue.

## Product Purpose

Équivalent léger de Google Agenda : gérer des événements (vues
Mois/Semaine/Jour/Liste, catégories, recherche) sans dépendre d'un
service tiers. C'est en même temps un terrain d'apprentissage/pratique
assumé (Vue 3 Composition API, Pinia, architecture CSS ITCSS, CI/CD sur
Render) — les deux objectifs coexistent, la qualité de code et
d'architecture compte autant que les fonctionnalités livrées.

## Positioning

Démonstration de maîtrise d'une stack Vue 3 / Node-Express moderne, sans
base de données ni dépendances lourdes, avec un pipeline de déploiement
et une architecture CSS soignés — ce que montre le projet compte autant
que ce qu'il fait.

## Operating Context

- Deux serveurs en dev local : API Express (`http://localhost:4000`) et
  frontend Vite (`http://localhost:5173`).
- Un seul service en prod (Render) : le build frontend est servi
  directement par Express, une seule URL, pas de CORS à gérer en prod.
- Workflow git strict : `main` protégée, toujours via PR, CI GitHub
  Actions (tests backend + frontend) avant merge, déploiement Render
  déclenché automatiquement par le job `deploy` du workflow après un
  merge réussi sur `main`.

## Capabilities and Constraints

- Vues Mois / Semaine / Jour / Liste, navigation (aujourd'hui,
  précédent/suivant), mini-calendrier de navigation rapide.
- Création / édition / suppression d'événements (titre, description,
  lieu, dates, toute la journée, catégorie).
- 6 catégories colorées, filtre par catégorie dans la barre latérale.
- Recherche plein texte (titre, description, lieu).
- Pas de base de données : persistance dans `backend/data/events.json`.
- Sur le plan gratuit Render, le disque n'est pas persistant :
  `events.json` peut être réinitialisé à chaque redéploiement ou
  redémarrage après inactivité — limite connue, pas encore résolue
  (nécessiterait un Disk Render payant).

## Evidence on Hand

Aucune donnée de démonstration figée (testimonials, études de cas) — les
événements affichés sont ceux réellement saisis par l'utilisateur ou des
données de test créées manuellement. Ne pas inventer de contenu factice
au-delà de ça.

## Product Principles

- Pas de dépendance à un service tiers pour la donnée (stockage JSON
  local, pas de BDD externe).
- Architecture et conventions de code soignées comme partie du livrable
  (ITCSS, Composition API stricte, tests Vitest) — le code est aussi la
  démonstration.
- Un seul service, une seule URL en prod — simplicité de déploiement
  plutôt que scalabilité.
- Rigueur du workflow git (PR + CI obligatoires) même pour un projet
  solo, cohérente avec l'objectif portfolio.

## Accessibility & Inclusion

Bonnes pratiques WCAG de base à respecter (navigation clavier, contraste
suffisant, compatibilité lecteur d'écran), sans norme formelle imposée.
