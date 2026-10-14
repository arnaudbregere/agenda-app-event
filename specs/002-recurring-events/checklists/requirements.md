# Specification Quality Checklist: Événements récurrents

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-14
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) — *voir Notes, exception documentée*
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders — *voir Notes, exception documentée*
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification — *voir Notes, exception documentée*

## Notes

### Exception documentée : la section « Contraintes non fonctionnelles »

Trois items ci-dessus sont cochés **avec réserve**, et la réserve porte sur la
même section : `Requirements > Contraintes non fonctionnelles` (NFR-001 à
NFR-015).

Ce que la section contient de technique :

- NFR-006 parle de routes d'API.
- NFR-007 parle de format JSON.
- NFR-009 parle d'échec à la compilation.
- NFR-010 parle de contraintes de saisie du navigateur.
- NFR-011 cite `prefers-reduced-motion`.
- NFR-012 cite `DESIGN.md`.

Pourquoi elle reste malgré la règle : ce ne sont pas des choix de conception
glissés dans la spécification, mais des **contraintes de gouvernance déjà
ratifiées** dans `.specify/memory/constitution.md` (principes I, III, V et VI),
auxquelles s'ajoute une exigence explicite de l'auteur du projet le 2026-10-14
— « évite les doublons ou le code mort ». Les retirer les rendrait invisibles à
`/speckit-plan` et à la revue, ce qui est le contraire de l'intention.

Précaution prise : la section est isolée sous un titre distinct, elle renvoie à
la constitution, et **aucun** de ces éléments n'apparaît dans les exigences
fonctionnelles (FR-001 à FR-024), dans les scénarios d'acceptation ni dans les
critères de succès (SC-001 à SC-012), qui restent formulés en termes
observables par l'utilisateur.

Le reste de la spécification est lisible sans connaissance du code. Les deux
seules mentions techniques hors de cette section sont dans `Hors périmètre`
(`RRULE`, `EXDATE`, `RECURRENCE-ID`), nécessaires pour nommer sans ambiguïté
l'issue de suivi à créer.

### Points d'attention pour `/speckit-plan`

- **SC-011** (« perçu comme instantané ») est le critère le plus faiblement
  mesurable de la liste. Il est volontairement qualitatif : le plan doit décider
  comment l'objectiver, ou l'assumer comme un simple garde-fou de non-régression.
- **FR-012 et SC-006** (plafond de 500 occurrences) décrivent une borne
  d'affichage et non une règle de validation. Le plan ne doit pas la déplacer
  vers la validation des données : ce serait réintroduire du calcul de dates là
  où NFR-001 l'interdit.
- **NFR-004** impose une suppression, pas un ajout. Le plan doit la traiter comme
  une tâche à part entière, avec réécriture des tests concernés, et non comme un
  nettoyage optionnel de fin de parcours.

### Statut

Aucun item ne requiert de mise à jour de la spécification avant
`/speckit-clarify` ou `/speckit-plan`. Les trois réserves sont des exceptions
assumées et justifiées, pas des manques.
