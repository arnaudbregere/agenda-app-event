# Règles frontend (`frontend/`)

- Vue 3, exclusivement en Composition API avec `<script setup>` — pas
  d'Options API dans le code nouveau.
- Fonctions fléchées (`const f = () => {}`), pas de `function`/
  `async function` déclarées, dans le code nouveau (`<script setup>`,
  composables, stores).
- HTML sémantique avant les `div` : `<button>`, `<dialog>`, `<nav>`,
  `<h1>`-`<h6>`, `<p>`... un `div` seulement quand aucune balise
  sémantique ne convient (ex. un simple conteneur de mise en page flex).
  Rôles/attributs ARIA (`role`, `aria-*`) quand la sémantique native ne
  suffit pas (ex. `role="alertdialog"` sur `<dialog>`) ; focus géré
  (piège dans une modale, restitué à la fermeture) et navigable au
  clavier pour tout composant interactif custom (modale, menu, etc.).
- État partagé (événements, navigation calendrier) via **Pinia**
  (`frontend/src/stores`). Pas de prop-drilling profond ni de bus
  d'événements custom pour ce qui appartient à un store.
- Calculs de dates via **`date-fns`** — pas de manipulation manuelle de
  `Date` (fuseaux, mois à 0-index, etc. sont des pièges classiques).
- API : `frontend/src/api` — URL configurable via
  `frontend/.env.development` (`VITE_API_URL`), jamais en dur dans le code.

## CSS — ITCSS, pas de framework externe

`frontend/src/styles` suit la méthodologie **ITCSS**, composée via `@use`
(modules Sass) :

```
settings → tools → generic → elements → objects → components → utilities
```

- Respecter cet ordre de spécificité croissante : ne pas mettre de règles
  de composant dans `elements/`, ne pas mettre de reset dans
  `components/`, etc.
- **Design tokens en custom properties CSS** (`--var`), pas en variables
  Sass — nécessaire pour la thémabilité à l'exécution.
- **Breakpoints en variables Sass**, consommées via le mixin
  `respond-down()` — seul cas où le Sass natif est utilisé plutôt que du
  CSS natif (le CSS n'a pas d'équivalent aux media queries paramétrées par
  variable).
- Pas de framework CSS externe (Tailwind, Bootstrap...) — rester cohérent
  avec l'architecture ITCSS existante plutôt que d'en importer un.
- Avant de chercher une solution JS pour un effet visuel, vérifier si du
  CSS pur suffit (transitions, `:has()`, container queries...).

## Tests

- Vitest (`npm test` = `vitest run`, `npm run test:watch` pour le mode
  watch).
