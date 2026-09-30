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
- **Breakpoints en variables Sass**, consommées via le mixin
  `respond-down()` — seul cas où le Sass natif est utilisé plutôt que du
  CSS natif (le CSS n'a pas d'équivalent aux media queries paramétrées par
  variable).
- Pas de framework CSS externe (Tailwind, Bootstrap...) — rester cohérent
  avec l'architecture ITCSS existante plutôt que d'en importer un.
- Avant de chercher une solution JS pour un effet visuel, vérifier si du
  CSS pur suffit (transitions, `:has()`, container queries...).

## Accessibilité — RGAA 4.1 / WCAG 2.1 AA

Cible et détail des critères dans `PRODUCT.md` (section « Accessibility &
Inclusion »). Règles de code correspondantes, à appliquer sur tout
composant interactif nouveau ou modifié :

- **HTML sémantique avant les `div`** : `<button>`, `<dialog>`, `<nav>`,
  `<h1>`-`<h6>`, `<label>`... un `div`/`span` seulement quand aucune
  balise sémantique ne convient (ex. un simple conteneur de mise en page
  flex). ARIA (`role`, `aria-*`) en complément quand le HTML natif ne
  suffit pas (ex. `role="alertdialog"` sur `<dialog>`, différent du rôle
  implicite `dialog`), jamais à la place d'une balise native existante.
- **Focus** : `:focus-visible` toujours visible (jamais `outline: none`
  sans remplacement, cf. `elements/_elements.scss`) ; tout composant qui
  s'ouvre/se ferme (modale, dialogue) piège le focus pendant l'ouverture
  et le restitue à l'élément déclencheur à la fermeture.
- **Clavier** : tout élément interactif atteignable et actionnable au
  clavier (Tab, Entrée/Espace, Échap pour fermer une modale), sans piège
  au clavier hors piège de focus volontaire d'une modale ouverte.
- **Formulaires** : chaque champ a un `<label>` associé (jamais un
  `placeholder` seul en guise de label), erreurs de validation associées
  au champ concerné.
- **Icônes** (`components/ui/Icon.vue`) : `aria-hidden="true"` si
  décorative (déjà le cas par défaut sur le `<svg>`), `aria-label` sur le
  bouton/élément porteur si l'icône seule transmet l'information (bouton
  icône sans texte visible).
- **Mouvement** : toute animation/transition ajoutée doit rester couverte
  par la règle globale `prefers-reduced-motion` (`generic/_reset.scss`) —
  vérifier plutôt que présumer que la règle universelle suffit toujours.
- **Contrastes** : au moins 4.5:1 texte normal / 3:1 grand texte et UI
  avant d'ajouter une couleur à `settings/_colors.scss`.

## Tests

- Vitest (`npm test` = `vitest run`, `npm run test:watch` pour le mode
  watch).
