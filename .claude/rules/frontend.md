# Règles frontend (`frontend/`)

- Vue 3, exclusivement en Composition API avec `<script setup>` — pas
  d'Options API dans le code nouveau.
- Fonctions fléchées (`const f = () => {}`), pas de `function`/
  `async function` déclarées, dans le code nouveau (`<script setup>`,
  composables, stores).
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
- **Mobile-first** : styles de base pour petit écran, enrichis pour les
  écrans plus larges. **Breakpoints en variables Sass**, consommées via le
  mixin `respond-up()` (media query `min-width`) — seul cas où le Sass
  natif est utilisé plutôt que du CSS natif (le CSS n'a pas d'équivalent
  aux media queries paramétrées par variable).
- Pas de framework CSS externe (Tailwind, Bootstrap...) — rester cohérent
  avec l'architecture ITCSS existante plutôt que d'en importer un.
- Avant de chercher une solution JS pour un effet visuel, vérifier si du
  CSS pur suffit (transitions, `:has()`, container queries...).

## Accessibilité et design — implémentation

Les critères (RGAA 4.1 / WCAG 2.1 AA) sont dans `PRODUCT.md`, section
« Accessibility & Inclusion ». Le design (tokens, boutons, couleurs) est dans
`DESIGN.md`. Ce qui suit ne concerne que la mise en œuvre dans ce repo :

- **Focus** : `:focus-visible` global dans `elements/_elements.scss`, jamais
  `outline: none` sans remplacement. Un composant qui s'ouvre/se ferme piège et
  restitue le focus (voir `ConfirmDialog.vue`, `EventModal.vue`).
- **Icônes** : `components/ui/Icon.vue` rend un `<svg aria-hidden="true">`. Si
  l'icône seule porte le sens, mettre un `aria-label` sur le bouton.
- **Mouvement** : `prefers-reduced-motion` est géré dans `generic/_reset.scss`.
  Toute transition ajoutée doit rester couverte.
- **Couleurs** : tout ajout dans `settings/_colors.scss` documente son ratio de
  contraste dans `DESIGN.md` (frontmatter `colors`, avec commentaire).
- **Composants UI** : tout composant nouveau ou modifié suit `DESIGN.md`
  (boutons, One Accent Rule, Flat-By-Default). Avant commit, `/impeccable
  critique` ou `/impeccable detect` (voir `CLAUDE.md`, section « Design et
  agents »).

## Tests

- Vitest (`npm test` = `vitest run`, `npm run test:watch` pour le mode
  watch).
