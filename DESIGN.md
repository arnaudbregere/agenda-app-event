---
name: Agenda
description: Clone léger de Google Agenda — hommage assumé à Material Design
colors:
  google-blue: "#1a73e8"
  google-blue-dark: "#1558b3"
  google-blue-light: "#d2e3fc"
  paper-white: "#ffffff"
  cloud-subtle: "#f6f8fc"
  mist-muted: "#eef0f4"
  border-neutral: "#dadce0"
  border-neutral-strong: "#c4c7cc"
  ink: "#1f1f1f"
  ink-muted: "#5f6368"
  ink-subtle: "#80868b"
  alert-red: "#d93025"
  alert-red-bg: "#fce8e6"
  confirm-green: "#188038"
  today-blue-bg: "#e8f0fe"
  weekend-bg: "#fafafa"
  outside-month-text: "#b3b6ba"
  now-line-red: "#ea4335"
  overlay-scrim: "rgba(32, 33, 36, 0.6)"
  category-personnel: "#4285f4"
  category-travail: "#0b8043"
  category-important: "#d50000"
  category-famille: "#f4511e"
  category-loisirs: "#8e24aa"
  category-autre: "#616161"
typography:
  headline:
    fontFamily: "Google Sans, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.2
  title:
    fontFamily: "Google Sans, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.2
  body:
    fontFamily: "Google Sans, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Google Sans, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.5
  caption:
    fontFamily: "Google Sans, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "4px"
  md: "8px"
  lg: "16px"
  full: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  7: "32px"
  8: "40px"
  9: "48px"
components:
  button-primary:
    backgroundColor: "{colors.google-blue}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.full}"
    height: "36px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.google-blue-dark}"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.sm}"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "50%"
    height: "40px"
    width: "40px"
  input-field:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  modal-panel:
    backgroundColor: "{colors.paper-white}"
    rounded: "{rounded.lg}"
  search-bar:
    backgroundColor: "{colors.mist-muted}"
    rounded: "{rounded.full}"
    height: "40px"
  search-bar-focus:
    backgroundColor: "{colors.paper-white}"
  day-badge-today:
    backgroundColor: "{colors.google-blue}"
    textColor: "{colors.paper-white}"
    rounded: "50%"
  view-switcher-active:
    backgroundColor: "{colors.google-blue-light}"
    textColor: "{colors.google-blue-dark}"
---

# Design System: Agenda

## Overview

**Creative North Star: "The Material Echo"**

Agenda ne prétend pas inventer un nouveau langage visuel : c'est un
hommage assumé à Google Material Design, reconstruit token par token
(couleur d'accent, échelle d'élévation, empilement typographique) plutôt
que copié en surface. Le projet est autant une démonstration de
compétence technique (portfolio) qu'un outil fonctionnel — la fidélité
au système qu'il imite fait partie de la preuve de maîtrise.

L'ambiance est propre, neutre et fonctionnelle. L'interface reste calme
et prévisible ; l'accent bleu (`google-blue`) est rare et signifiant,
réservé aux actions primaires, à l'état actif et au jour courant. Les
couleurs de catégorie sont la seule zone où la palette s'anime
librement — elles portent l'identité de chaque événement sans jamais
déborder sur le chrome de l'application. Rien de décoratif ou
« flashy » ne doit distraire de la tâche : un agenda est un outil, pas
une vitrine.

**Key Characteristics:**
- Un seul accent de marque (`google-blue`), utilisé avec parcimonie
- Surfaces plates au repos, élévation Material stricte comme réponse à l'état
- Boutons pilule (radius full) pour les actions primaires
- Couleurs de catégorie comme unique zone d'expression chromatique libre

## Colors

La palette est directement héritée du vocabulaire Google Material :
bleu de marque rare, neutres gris-bleu pour le chrome, six couleurs de
catégorie saturées pour différencier les événements.

### Primary
- **Google Blue** (`#1a73e8`): accent de marque — boutons primaires, lien actif de la vue en cours, bordure du jour courant, focus ring.
- **Google Blue Dark** (`#1558b3`): état hover du bouton primaire.
- **Google Blue Light** (`#d2e3fc`): fond du sélecteur de vue actif (Mois/Semaine/Jour/Liste) et couleur de sélection de texte (`::selection`).

### Neutral
- **Paper White** (`#ffffff`): fond de base, panneaux (modale, sidebar create).
- **Cloud Subtle** (`#f6f8fc`): fond du corps de page et de la sidebar.
- **Mist Muted** (`#eef0f4`): fond hover des boutons texte/icône.
- **Border Neutral** (`#dadce0`): bordures standard (inputs, séparateurs de header/modale, sélecteur de vue).
- **Border Neutral Strong** (`#c4c7cc`): bordure renforcée, usage ponctuel.
- **Ink** (`#1f1f1f`): texte principal.
- **Ink Muted** (`#5f6368`): texte secondaire (labels, heure des événements, titres de section sidebar).
- **Ink Subtle** (`#80868b`): texte tertiaire (jours hors-mois, pastille de catégorie par défaut).

### État & sémantique
- **Alert Red** (`#d93025`) / **Alert Red Bg** (`#fce8e6`): erreurs de formulaire, action de suppression.
- **Confirm Green** (`#188038`): état de succès (réservé, peu utilisé actuellement).
- **Now Line Red** (`#ea4335`): ligne "maintenant" dans la vue Semaine/Jour — volontairement distincte de `alert-red` (rouge Google standard, pas un rouge d'erreur).
- **Today Blue Bg** (`#e8f0fe`): fond de la cellule du jour courant dans le calendrier.
- **Weekend Bg** (`#fafafa`): léger contraste des colonnes week-end.
- **Outside Month Text** (`#b3b6ba`): texte des jours hors du mois affiché.
- **Overlay Scrim** (`rgba(32, 33, 36, 0.6)`): voile derrière la modale.

### Catégories (couleur libre par événement)
- **Personnel** (`#4285f4`) · **Travail** (`#0b8043`) · **Important** (`#d50000`) · **Famille** (`#f4511e`) · **Loisirs** (`#8e24aa`) · **Autre** (`#616161`).

### Named Rules
**The One Accent Rule.** `google-blue` n'apparaît que sur les actions primaires, l'état actif et le jour courant — jamais comme couleur décorative. Toute couleur vive ailleurs vient de la catégorie de l'événement, pas du chrome de l'app.

## Typography

**Body Font:** Google Sans (fallback Segoe UI, Roboto, Helvetica, Arial, sans-serif) — seule famille utilisée dans tout le projet, la hiérarchie se fait par taille et graisse, pas par changement de police.

**Character:** Une seule famille sobre, portée par une échelle de taille resserrée (11 à 24px) — typique d'une UI d'outil dense en information plutôt que d'un site éditorial.

### Hierarchy
- **Headline** (500, 24px, 1.2): titre de marque de l'app (`h1`, "Agenda").
- **Title** (500, 20px/16px, 1.2): titres de section et de modale (`h2`/`h3`).
- **Body** (400, 14px, 1.5): texte courant, contenu de formulaire.
- **Label** (500, 12px, 1.5): labels de formulaire, items de filtre catégorie, boutons `sm`.
- **Caption** (400, 11px, 1.5): heures d'événement dans les blocs de la grille horaire, badges de catégorie.

### Named Rules
**The Single Family Rule.** Toute la hiérarchie typographique repose sur une seule famille (Google Sans) ; jamais de police secondaire pour "faire différent" — la variation vient uniquement de taille/graisse.

## Layout

Structure en grille CSS fixe (`o-app-shell`) : header pleine largeur en haut, sidebar (`--sidebar-width: 260px`) + zone principale scrollable en dessous. Sous 900px (`respond-down(md)`), la sidebar se rétracte à largeur 0 et s'ouvre en overlay via la classe `is-sidebar-open` ; la recherche du header disparaît et le titre passe en taille `title`.

Rythme d'espacement sur une échelle à 9 crans, base 4px (`--space-1` à `--space-9`), utilisée uniformément pour padding, marge et gap — pas de valeurs magiques hors échelle. Dimensions structurelles dédiées (`--header-height: 64px`, `--time-gutter-width: 56px`, `--hour-row-height: 48px`) pour les grilles de calendrier horaire.

## Elevation & Depth

Élévation Material stricte confirmée : trois niveaux d'ombre douce, tonale et fixe, exactement calqués sur les tokens d'élévation Material (`0 1px 2px`, `0 1px 3px 1px`, `0 4px 8px 3px`, teinte neutre `rgba(60,64,67,…)`). Les surfaces sont plates au repos ; l'ombre n'apparaît qu'en réponse à un état (hover du bouton primaire, hover d'une carte d'événement, hover du bouton "Créer" de la sidebar) ou pour détacher durablement un panneau flottant (modale).

### Shadow Vocabulary
- **shadow-sm** (`0 1px 2px 0 rgba(60,64,67,0.3)`): repos du bouton primaire, blocs d'événement dans la grille horaire.
- **shadow-md** (`0 1px 3px 1px rgba(60,64,67,0.3)`): hover du bouton primaire et des blocs d'événement, repos du bouton "Créer".
- **shadow-lg** (`0 4px 8px 3px rgba(60,64,67,0.3), 0 1px 3px rgba(60,64,67,0.3)`): modale, hover du bouton "Créer".

### Named Rules
**The Flat-By-Default Rule.** Aucune surface ne porte d'ombre à l'état de repos, sauf les panneaux flottants (modale). L'ombre est toujours une réponse à l'interaction, jamais une décoration statique.

## Shapes

Deux familles de rayon selon l'échelle de l'élément : `radius-sm` (4px) pour les éléments denses (event pill, input, sélecteur de vue), `radius-md` (8px) pour la carte "Créer" de la sidebar, `radius-lg` (16px) pour le panneau de la modale. Les éléments strictement circulaires (bouton icône, checkbox de catégorie, pastille de couleur, swatch) utilisent `50%` ou `radius-full` (999px pour les boutons pilule). Pas de bordure décorative : les seules bordures visibles séparent des zones fonctionnelles (header/modale, inputs, sélecteur de vue) en `border-neutral` 1px.

## Components

### Buttons
- **Shape:** pilule (`radius-full`, 999px) pour `--primary` ; carré à coins doux (`radius-sm`, 4px) pour `--text` ; cercle parfait (50%) pour `--icon`.
- **Primary:** fond `google-blue`, texte `paper-white`, `shadow-sm` au repos.
- **Hover / Focus:** primary passe à `google-blue-dark` + `shadow-md` ; text/icon prennent un fond `mist-muted` ; focus visible via l'anneau `focus-ring` (2px fond + 4px `google-blue`) sur tous les éléments interactifs.
- **Danger:** transparent au repos, fond `alert-red-bg` au hover, texte `alert-red`.
- **Disabled:** opacité 0.5, curseur désactivé.

### Event Pill / Event Block (signature component)
- **Vue Mois (pill):** fond = couleur de catégorie mélangée à 16% avec blanc (`color-mix`), bordure gauche 3px pleine couleur de catégorie — lisible sans écraser le texte.
- **Vue Semaine/Jour (block):** bloc plein de la couleur de catégorie, texte inversé, positionné en absolu dans la grille horaire, `shadow-sm` au repos → `shadow-md` + léger éclaircissement au hover.
- **Journée entière:** bandeau plein compact au-dessus de la grille horaire, même traitement de couleur que le block.

### Cards / Containers
- **Corner Style:** `radius-lg` (modale), `radius-md` (carte "Créer" sidebar).
- **Background:** `paper-white`.
- **Shadow Strategy:** voir Elevation & Depth — jamais de shadow au repos sauf la modale.
- **Border:** aucune sur les cartes ; la modale sépare header/footer par un trait `border-neutral` 1px interne, pas de bordure externe.

### Inputs / Fields
- **Style:** bordure `border-neutral` 1px, fond `paper-white`, `radius-sm`.
- **Focus:** anneau `focus-ring` (pas de changement de bordure).
- **Error:** message sous le champ en `alert-red`, `font-size` label.

### Navigation
- **Sélecteur de vue:** groupe de boutons contigus dans un cadre `border-neutral` unique, séparateurs internes 1px. Repos : texte `ink-muted`, fond transparent. Hover : fond `mist-muted`. Actif : fond `google-blue-light`, texte `google-blue-dark`, poids `medium` — jamais les trois états en même temps sur deux boutons.
- **Header:** fond `paper-white`, séparé du contenu par `border-neutral` 1px, logo + titre à gauche, recherche centrée (masquée sous 900px), actions à droite. Sous 900px le titre passe en taille `title` et perd sa largeur minimale.

### Search Bar
- **Shape:** pilule (`radius-full`), aucune bordure — se détache du fond par la couleur seule.
- **Repos:** fond `mist-muted`, icône loupe en `ink-subtle` à gauche, hauteur 40px.
- **Focus:** fond passe à `paper-white` + `shadow-sm` + anneau de focus — c'est la seule pilule du système qui gagne une ombre au focus plutôt qu'au hover.
- **Clear:** bouton rond 24px en haut à droite du champ, apparaît uniquement avec une saisie, fond `border-neutral` au hover.

### Day Badge (signature, motif réutilisé)
Le même motif de pastille circulaire pour le numéro du jour revient dans trois composants (mini-calendrier, grille Mois, en-tête de grille horaire) — traité comme un seul composant logique plutôt que trois variantes indépendantes.
- **Repos:** cercle transparent, texte `ink`.
- **Jour courant (`is-today`):** fond `google-blue` plein, texte `paper-white`, poids `bold` dans la grille Mois / mini-calendrier ; fond identique mais poids normal dans l'en-tête de grille horaire.
- **Sélectionné (mini-calendrier uniquement, `is-selected`):** même traitement que "jour courant" mais indépendant de la date du jour.
- **Hors du mois affiché (`is-outside`):** texte `outside-month-text`, pas de fond.

### Mini Calendar (signature)
Widget de navigation rapide dans la sidebar : grille 7 colonnes, en-têtes de jour en `caption` + `ink-subtle`, cellules carrées (`aspect-ratio: 1`) avec le motif Day Badge. Hover neutre en `mist-muted`. Volontairement dense — aucune ombre, aucune bordure, la seule séparation vient de l'espacement.

### Month Grid (signature)
Grille 7×N pleine hauteur, bordures fines `border-neutral` entre cellules (jamais de bordure externe au conteneur). Colonnes week-end teintées `weekend-bg`. Chaque cellule empile le Day Badge puis une pile compacte d'Event Pills (2px de gap) ; au-delà de la capacité visible, un lien "+N" en `caption`/`ink-muted` avec hover `mist-muted` + `radius-sm`. Cellule entière cliquable, hover `cloud-subtle`.

### Time Grid (signature, vues Semaine/Jour)
Grille horaire 24h avec gouttière de labels (`--time-gutter-width: 56px`) et lignes d'heure fixes (`--hour-row-height: 48px`) séparées par un trait `border-neutral` interne. Bandeau "journée entière" séparé au-dessus (Event Allday). La ligne "maintenant" (**Now Line**) est le seul élément rouge (`now-line-red`) du calendrier hors état d'erreur : trait 2px pleine largeur + pastille pleine à gauche, volontairement distincte visuellement de `alert-red` pour ne jamais se lire comme une erreur.

### Agenda List (vue Liste)
Colonne centrée (max 720px), groupée par jour : date en `headline`-scale (`font-size-xl`) à gauche dans une colonne fixe 80px, items à droite en pile compacte. Jour courant : date en `google-blue` + `bold`. Chaque item est une ligne heure + titre ; au hover le titre seul passe en `google-blue` (pas de fond, pas de soulignement) — signature du survol dans cette vue, différente du hover à fond des autres listes (filtre catégorie, sélecteur de vue).

## Do's and Don'ts

### Do:
- **Do** réserver `google-blue` aux actions primaires, à l'état actif et au jour courant (**The One Accent Rule**).
- **Do** garder les surfaces plates au repos ; n'introduire une ombre qu'en réponse à un hover ou pour un panneau flottant (**The Flat-By-Default Rule**).
- **Do** utiliser exclusivement les couleurs de catégorie pour différencier des événements, jamais pour du chrome d'UI.
- **Do** garder toute la hiérarchie typographique sur une seule famille (**The Single Family Rule**).
- **Do** réutiliser le motif Day Badge (pastille circulaire) pour tout nouvel indicateur de jour courant/sélectionné plutôt que d'inventer un nouveau traitement.

### Don't:
- **Don't** ajouter une deuxième couleur d'accent de marque à côté de `google-blue`.
- **Don't** introduire un framework CSS externe (Tailwind, Bootstrap…) — tout passe par les custom properties ITCSS existantes.
- **Don't** utiliser une valeur d'espacement, de rayon ou d'ombre hors des échelles définies (`--space-*`, `--radius-*`, `--shadow-*`).
- **Don't** faire porter une ombre à une surface au repos en dehors des panneaux flottants.
- **Don't** utiliser `now-line-red` en dehors de la ligne "maintenant" — c'est un rouge Google standard, pas le vocabulaire d'erreur (`alert-red`).
