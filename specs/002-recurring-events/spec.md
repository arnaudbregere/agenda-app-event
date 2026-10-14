# Feature Specification: Événements récurrents

**Feature Branch**: `feat/recurring-events-54`

**Created**: 2026-10-14

**Status**: Draft

**Input**: Issue [#54](https://github.com/arnaudbregere/agenda-app-event/issues/54) — « Événements récurrents (quotidien / hebdomadaire / mensuel) », complétée par le brief `/impeccable shape` validé le 2026-10-14.

## Clarifications

### Session 2026-10-14

Décisions prises avec l'auteur du projet avant rédaction. Elles ferment les trois
points laissés « à définir » par l'issue #54, plus trois choix de composition.

- Q: Comment borner une série : date de fin, nombre d'occurrences, ou les deux ? → A: **date de fin seule, et obligatoire**. Pas de nombre d'occurrences, pas de série sans fin. Un seul champ à valider, et le cas non borné disparaît complètement.
- Q: Comment stocker une occurrence modifiée ou supprimée seule ? → A: **exclusions sur la série + occurrences surchargées** rattachées à leur série (modèle RFC 5545), plutôt que d'éclater la série en N événements indépendants.
- Q: Où calculer les occurrences visibles ? → A: **à l'affichage**, à la volée sur la période consultée. Le stockage ne contient jamais d'occurrence matérialisée.
- Q: Comment la récurrence entre-t-elle dans le formulaire ? → A: **case à cocher « Événement récurrent »** sous « Toute la journée », qui révèle les champs de récurrence. Un événement simple ne paie qu'une ligne de formulaire.
- Q: Comment demander la portée (« cette occurrence » / « toute la série ») ? → A: **sélecteur de portée dans la modale d'édition**, avant l'acte. Il gouverne l'enregistrement *et* la suppression, ce qui évite un dialogue de portée séparé.
- Q: Comment signaler qu'un événement est récurrent dans les vues ? → A: **repère visuel dans les 4 vues**, y compris la vue Mois, malgré son coût en largeur de titre.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Créer une série et la voir dans les 4 vues (Priority: P1)

L'utilisateur saisit un rendez-vous qui revient — « réunion d'équipe, chaque lundi,
jusqu'au 31 décembre » — en une seule fois, et le retrouve à chacune de ses dates
dans les vues Mois, Semaine, Jour et Liste.

**Why this priority**: c'est la raison d'être de la fonctionnalité. Sans elle,
l'utilisateur crée 52 événements à la main. Les quatre autres histoires ne
servent à rien tant que celle-ci n'existe pas.

**Independent Test**: créer une série hebdomadaire couvrant deux mois, puis naviguer
dans les quatre vues et vérifier qu'elle apparaît à chaque date attendue, et nulle
part ailleurs.

**Acceptance Scenarios**:

1. **Given** le formulaire de création ouvert, **When** l'utilisateur coche « Événement récurrent », **Then** les champs fréquence, intervalle et date de fin apparaissent, et la date de fin est obligatoire.
2. **Given** une récurrence hebdomadaire du 20 octobre au 31 décembre 2026, **When** l'utilisateur consulte le mois de novembre, **Then** les 5 lundis de novembre portent chacun l'événement.
3. **Given** la même série, **When** l'utilisateur consulte janvier 2027, **Then** aucune occurrence n'est affichée.
4. **Given** le formulaire avec une récurrence saisie, **When** l'utilisateur lit le récapitulatif sous les champs, **Then** il y voit le nombre d'occurrences et la date de fin avant d'enregistrer.
5. **Given** une date de fin antérieure à la date de début, **When** l'utilisateur tente d'enregistrer, **Then** un message d'erreur en français est associé au champ de date de fin, et rien n'est créé.
6. **Given** un événement non récurrent, **When** l'utilisateur consulte les quatre vues, **Then** son affichage est identique à aujourd'hui.

---

### User Story 2 - Agir sur toute la série (Priority: P2)

L'utilisateur renomme une série entière, ou la supprime entièrement, en un seul
geste.

**Why this priority**: c'est le pendant immédiat de la création, et le geste de
rattrapage quand une série a été mal saisie. Nettement moins coûteux que les
exceptions, donc livrable avant elles.

**Independent Test**: créer une série, en ouvrir une occurrence, choisir la portée
« toute la série », renommer, puis vérifier que toutes les occurrences portent le
nouveau titre.

**Acceptance Scenarios**:

1. **Given** une occurrence d'une série ouverte en édition, **When** l'utilisateur consulte la modale, **Then** un sélecteur de portée propose « Cette occurrence » (sélectionné par défaut) et « Toute la série ».
2. **Given** la portée « Toute la série » sélectionnée, **When** l'utilisateur change le titre et enregistre, **Then** toutes les occurrences affichent le nouveau titre.
3. **Given** la portée « Toute la série » sélectionnée, **When** l'utilisateur consulte les champs de date, **Then** ils sont en lecture seule, et un libellé explique que déplacer une série demande de la recréer.
4. **Given** la portée « Toute la série » sélectionnée, **When** l'utilisateur supprime et confirme, **Then** la série entière disparaît des quatre vues, occurrences surchargées comprises.
5. **Given** une occurrence d'une série ouverte en édition, **When** l'utilisateur décoche « Événement récurrent » et enregistre, **Then** il ne reste qu'un seul événement, à la date d'ancrage de la série.
6. **Given** un événement non récurrent ouvert en édition, **When** l'utilisateur consulte la modale, **Then** aucun sélecteur de portée n'est affiché.

---

### User Story 3 - Supprimer une occurrence seule (Priority: P3)

Un lundi est férié : l'utilisateur retire cette seule occurrence sans toucher aux
autres.

**Why this priority**: premier des deux cas d'exception, et le plus fréquent. Il
introduit la notion d'exclusion, sur laquelle l'histoire 4 s'appuie.

**Independent Test**: créer une série de 5 occurrences, en supprimer une avec la
portée « Cette occurrence », vérifier que les 4 autres sont intactes et que la
supprimée ne revient pas après rechargement de la page.

**Acceptance Scenarios**:

1. **Given** une série de 5 occurrences, **When** l'utilisateur supprime la 3ᵉ avec la portée « Cette occurrence », **Then** les 4 autres restent affichées et la 3ᵉ disparaît.
2. **Given** l'occurrence supprimée, **When** l'utilisateur recharge la page, **Then** elle est toujours absente.
3. **Given** une suppression d'occurrence en cours, **When** la confirmation s'affiche, **Then** son message indique que seule cette occurrence est concernée, pas la série.
4. **Given** une série dont toutes les occurrences ont été supprimées une à une, **When** l'utilisateur consulte les vues, **Then** plus rien n'est affiché, sans erreur ni message d'état particulier.
5. **Given** une série amputée d'une occurrence, **When** l'utilisateur relit le récapitulatif de la série, **Then** le nombre affiché tient compte de l'exclusion.

---

### User Story 4 - Modifier une occurrence seule (Priority: P4)

Le rendez-vous de cette semaine est décalé d'une heure, ou change de lieu, mais
seulement celui-là.

**Why this priority**: le plus coûteux des cas d'exception, et le moins fréquent.
Il dépend de l'exclusion introduite en histoire 3.

**Independent Test**: créer une série, décaler une occurrence d'une heure avec la
portée « Cette occurrence », vérifier que cette date porte le nouvel horaire et
que les autres gardent l'ancien.

**Acceptance Scenarios**:

1. **Given** une série à 9h, **When** l'utilisateur déplace une occurrence à 10h avec la portée « Cette occurrence », **Then** cette date affiche 10h et toutes les autres restent à 9h.
2. **Given** une occurrence ainsi modifiée, **When** l'utilisateur modifie ensuite le titre de toute la série, **Then** l'occurrence modifiée conserve son horaire propre.
3. **Given** une occurrence ainsi modifiée, **When** l'utilisateur supprime toute la série, **Then** l'occurrence modifiée disparaît aussi.

---

### User Story 5 - Repérer une série dans les vues (Priority: P5)

L'utilisateur distingue au premier coup d'œil un événement qui se répète d'un
événement unique, sans avoir à l'ouvrir.

**Why this priority**: confort de lecture, pas une capacité. Livrable
indépendamment, et volontairement en dernier pour ne pas retarder le reste.

**Independent Test**: afficher côte à côte une occurrence et un événement simple
dans chacune des quatre vues, et vérifier que seul le premier porte le repère.

**Acceptance Scenarios**:

1. **Given** une occurrence et un événement simple le même jour, **When** l'utilisateur consulte chacune des quatre vues, **Then** seule l'occurrence porte le repère de répétition.
2. **Given** une occurrence dont le titre est long, **When** la vue Mois l'affiche sur un écran de 360px de large, **Then** le repère reste visible et c'est le titre qui est tronqué.
3. **Given** une occurrence, **When** elle est lue par un lecteur d'écran, **Then** son caractère récurrent est annoncé par un texte, pas seulement par le repère visuel.

---

### Edge Cases

- **Série d'une seule occurrence** : date de fin égale à la date de début. Valide ; le récapitulatif annonce « 1 occurrence ».
- **Mensuel un 29, 30 ou 31** : les mois trop courts reçoivent l'occurrence à leur dernier jour (écrêtage), plutôt que de la sauter. Comportement à documenter explicitement.
- **Série très longue** : une saisie ne peut pas produire une série non bornée, puisque la date de fin est obligatoire. Au-delà d'un plafond de 500 occurrences, l'affichage s'arrête à ce plafond sans erreur ni blocage — y compris pour un fichier de données édité à la main hors de l'application.
- **Série entièrement exclue** : la série subsiste et n'affiche rien. Pas d'état vide dédié.
- **Changement d'heure (heure d'été / d'hiver)** : une série hebdomadaire à 9h reste à 9h locales de part et d'autre du changement.
- **Exclusion orpheline** : une exclusion qui ne correspond à aucune occurrence réelle n'exclut rien et ne provoque pas d'erreur.
- **Recherche plein texte** : la recherche trouve les occurrences d'une série, y compris hors de la période consultée, dans la limite de la plage couverte par les séries existantes.
- **Export iCal** : hors périmètre (voir Hors périmètre). Une série est exportée comme un événement unique non répété — perte silencieuse assumée jusqu'à l'issue de suivi.

## Requirements *(mandatory)*

### Functional Requirements

**Saisie et modèle**

- **FR-001**: Les utilisateurs MUST pouvoir marquer un événement comme récurrent à la création comme à l'édition.
- **FR-002**: Le système MUST proposer exactement trois fréquences : quotidienne, hebdomadaire, mensuelle.
- **FR-003**: Le système MUST accepter un intervalle entier de 1 à 99 (« tous les 2 mois »), par défaut 1.
- **FR-004**: Le système MUST exiger une date de fin, et la refuser si elle est antérieure à la date de début.
- **FR-005**: Le système MUST refuser toute récurrence sans fin et toute borne exprimée en nombre d'occurrences.
- **FR-006**: Le système MUST conserver une série comme une seule entrée de données portant sa règle, sans jamais enregistrer ses occurrences une par une.
- **FR-007**: Le système MUST afficher, avant enregistrement, le nombre d'occurrences et la date de fin résultant de la règle saisie, exclusions déduites.
- **FR-008**: Les messages d'erreur de validation MUST être en français et associés au champ concerné.

**Affichage**

- **FR-009**: Le système MUST afficher chaque occurrence d'une série à sa date, dans les vues Mois, Semaine, Jour et Liste.
- **FR-010**: Le système MUST laisser l'affichage des événements non récurrents inchangé.
- **FR-011**: Le système MUST calculer les occurrences de la période consultée à l'affichage, et non à l'enregistrement.
- **FR-012**: Le système MUST borner l'affichage d'une série à 500 occurrences, sans erreur ni interruption au-delà.
- **FR-013**: Le système MUST faire apparaître les occurrences dans les résultats de recherche plein texte, sur la plage couverte par les séries existantes.
- **FR-014**: Le système MUST distinguer visuellement une occurrence d'un événement unique dans les quatre vues.
- **FR-015**: Le caractère récurrent MUST être accessible autrement que par le seul repère visuel.

**Portée des modifications**

- **FR-016**: Le système MUST demander la portée — cette occurrence ou toute la série — avant toute modification ou suppression d'une occurrence appartenant à une série.
- **FR-017**: Le sélecteur de portée MUST valoir « Cette occurrence » par défaut, et gouverner aussi bien l'enregistrement que la suppression.
- **FR-018**: Le sélecteur de portée MUST être absent à la création et sur un événement non récurrent.
- **FR-019**: En portée « toute la série », le système MUST propager le titre, la description, le lieu, la catégorie et l'heure, et MUST interdire la modification des dates.
- **FR-020**: En portée « cette occurrence », le système MUST n'affecter que l'occurrence visée et laisser les autres inchangées.
- **FR-021**: Le système MUST conserver les modifications d'une occurrence seule lors d'une modification ultérieure de toute la série.
- **FR-022**: La suppression de toute la série MUST emporter ses occurrences modifiées individuellement.
- **FR-023**: Le retrait de la récurrence d'une série existante MUST laisser un unique événement, à la date d'ancrage de la série.
- **FR-024**: Le message de confirmation de suppression MUST indiquer la portée effective.

### Contraintes non fonctionnelles

Issues de `.specify/memory/constitution.md` et de la contrainte explicite « pas de
doublons, pas de code mort » posée par l'auteur. Vérifiables en revue.

- **NFR-001**: Le calcul des dates de récurrence MUST exister en un seul endroit du dépôt. Aucune seconde implémentation, même partielle, dans un autre paquet.
- **NFR-002**: Les événements récurrents et non récurrents MUST emprunter le même chemin d'affichage. Aucune vue ne teste si un événement est une série.
- **NFR-003**: Le test d'appartenance d'un événement à un jour MUST rester celui déjà en place. Pas de seconde implémentation du chevauchement.
- **NFR-004**: Le point d'accès aux événements affichables MUST être unique. L'ancien accesseur MUST être supprimé une fois sans appelant, et ses tests réécrits — pas conservé en parallèle.
- **NFR-005**: Le filtrage par catégorie et par recherche MUST rester en un seul exemplaire, consommé par ce point d'accès unique.
- **NFR-006**: Aucune route d'API nouvelle. La fonctionnalité MUST tenir dans les routes existantes.
- **NFR-007**: La couche de stockage MUST rester inchangée, et les données MUST rester du JSON lisible et documenté (constitution, principe I).
- **NFR-008**: Le calcul des occurrences MUST être écrit en fonctions pures, testables sans monter de composant ni d'état partagé.
- **NFR-009**: Le type d'une occurrence calculée MUST être distinct de celui d'un événement stocké, de sorte qu'envoyer une occurrence à l'API échoue à la compilation et non à l'exécution (constitution, principe III).
- **NFR-010**: Les contraintes de saisie déjà exprimables par le navigateur MUST l'être, plutôt que redoublées en code.
- **NFR-011**: Les critères RGAA 4.1 / WCAG 2.1 AA de `PRODUCT.md` MUST être tenus sur chaque contrôle ajouté : libellé associé, atteignable au clavier, focus visible, erreurs annoncées, mouvement respectant `prefers-reduced-motion`.
- **NFR-012**: `DESIGN.md` MUST être mis à jour avant le commit pour les contrôles ajoutés et pour la modification du composant signature d'affichage d'événement. Aucun jeton ni couleur nouveaux n'est attendu.
- **NFR-013**: Les tests automatisés MUST couvrir en priorité le calcul des occurrences : écrêtage mensuel, changement d'heure, série d'une seule occurrence, exclusions, plafond atteint.
- **NFR-014**: Les sélecteurs des tests de bout en bout MUST passer par les rôles et libellés accessibles, pas par des classes de style.
- **NFR-015**: Les suites de tests et les vérifications de types des trois paquets MUST être vertes avant toute proposition de commit (constitution, principe VI).

### Key Entities

- **Série** : un événement porteur d'une règle de répétition. Attributs propres à la règle : fréquence, intervalle, date de fin. Porte en outre la liste des dates exclues. Reste un événement ordinaire par tous ses autres attributs (titre, description, lieu, catégorie, horaires d'ancrage).
- **Règle de répétition** : fréquence (quotidienne, hebdomadaire, mensuelle), intervalle de 1 à 99, date de fin obligatoire. Ne décrit aucune date explicitement.
- **Occurrence** : apparition d'une série à une date donnée. Calculée, jamais stockée. Connaît la série dont elle vient et sa propre date de départ. Identité dérivée de ce couple.
- **Exclusion** : date d'une occurrence retirée de sa série. Rattachée à la série.
- **Occurrence surchargée** : événement stocké normalement, rattaché à sa série et à la date d'occurrence qu'il remplace. Prime sur l'occurrence calculée de cette date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un rendez-vous hebdomadaire sur un an se saisit en une seule fois, contre 52 saisies aujourd'hui.
- **SC-002**: Une série créée apparaît à 100 % de ses dates attendues dans les quatre vues, et à aucune autre date.
- **SC-003**: Supprimer une occurrence laisse les autres occurrences de la série intactes, vérifié après rechargement.
- **SC-004**: Modifier une occurrence seule n'altère aucune autre occurrence, y compris après une modification ultérieure de toute la série.
- **SC-005**: Aucune saisie possible dans l'interface ne produit une série non bornée.
- **SC-006**: Un fichier de données contenant une série dont la date de fin est à plusieurs siècles s'affiche sans blocage ni erreur.
- **SC-007**: Avant d'enregistrer, l'utilisateur connaît le nombre exact d'occurrences que sa règle va produire.
- **SC-008**: Une modification ou une suppression ne peut pas s'appliquer à une portée que l'utilisateur n'a pas vue affichée.
- **SC-009**: Les occurrences sont distinguables des événements uniques dans les quatre vues, sans ouvrir la fiche.
- **SC-010**: Toute la fonctionnalité est utilisable au clavier seul, et son caractère récurrent est perceptible sans la vue.
- **SC-011**: L'affichage d'un mois contenant des séries reste perçu comme instantané, sans ralentissement visible par rapport à aujourd'hui.
- **SC-012**: Les trois suites de tests et les trois vérifications de types passent.

## Assumptions

- **Utilisateur unique.** Conforme à `PRODUCT.md` : pas d'authentification, donc aucune question de visibilité ou de concurrence entre utilisateurs sur une série.
- **Date de fin obligatoire acceptée comme contrainte produit.** Elle écarte un usage légitime (« tous les lundis, indéfiniment ») au profit de la simplicité. Un nombre d'occurrences ou une série sans fin pourront s'ajouter plus tard sans casser les données existantes.
- **Déplacer une série entière n'est pas couvert.** Changer la date d'ancrage d'une série passe par sa suppression et sa recréation. Décision prise pour écarter le réancrage et l'invalidation des exclusions qu'il entraîne — absents des critères d'acceptation de l'issue #54.
- **Le plafond de 500 occurrences est une borne d'affichage, pas une règle de donnée.** Il protège le rendu et la recherche ; il n'est pas opposé à l'utilisateur comme une erreur de saisie.
- **L'écrêtage mensuel est le comportement attendu**, pas un défaut à corriger : un 31 janvier répété mensuellement tombe au 28 ou 29 février.
- **Compatibilité ascendante des données.** Les événements déjà présents dans le fichier n'ont aucun attribut de récurrence et doivent continuer à fonctionner sans migration.
- **Le socle existant est réutilisé** : formulaire d'événement, dialogue de confirmation, registre d'icônes, filtrage par catégorie et recherche. Aucun composant équivalent n'est créé en parallèle.

## Hors périmètre

Anti-objectifs explicites. Toute demande ci-dessous relève d'une issue séparée.

- **Export et import iCal des règles de répétition** (`RRULE`, `EXDATE`, `RECURRENCE-ID`). Issue de suivi à créer. ⚠️ Conséquence assumée jusque-là : l'export d'une série produit **un seul** événement non répété — perte silencieuse, à écrire dans la description de la PR et dans l'issue de suivi.
- **Jours de semaine multiples** (« lundi + mercredi + vendredi »).
- **Récurrence annuelle.**
- **Règles positionnelles** (« le 3ᵉ mardi du mois »).
- **Aperçu calendaire des occurrences** dans le formulaire ; le récapitulatif chiffré en tient lieu.
- **Borne par nombre d'occurrences** et **série sans fin.**
- **Déplacement d'une série entière** (voir Assumptions).
- **Refactorisation de la duplication de déclarations de champs côté backend** : elle est préexistante et doit être signalée, pas corrigée dans cette PR.
