# Feature Specification: Filtre des événements par catégorie

**Feature Branch**: `feat/events-category-filter`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "Filtre par catégorie sur la liste des événements : GET /api/events?category=<id> renvoie uniquement les événements de cette catégorie (id parmi personnel, travail, important, famille, loisirs, autre). Sans paramètre, comportement inchangé. Valeur inconnue : 400 avec un message d'erreur. Périmètre backend uniquement (route, contrôleur, validation). Pas d'UI."

## Clarifications

### Session 2026-10-05

- Q: Quelle forme pour l'erreur 400 quand la catégorie est inconnue : `{ "errors": [...] }` ou `{ "error": "..." }` ? → A: `{ "errors": ["..."] }`, comme la validation des corps existante.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lister les événements d'une catégorie (Priority: P1)

Un client de l'API (interface, script, autre outil) demande uniquement les événements d'une catégorie donnée, sans recevoir les autres.

**Why this priority**: c'est le besoin principal ; sans lui la fonctionnalité n'a pas de valeur.

**Independent Test**: créer des événements dans deux catégories, demander une seule catégorie, vérifier que seuls ceux de cette catégorie sont renvoyés.

**Acceptance Scenarios**:

1. **Given** des événements en catégories `travail` et `famille`, **When** le client demande la catégorie `travail`, **Then** seuls les événements `travail` sont renvoyés.
2. **Given** une catégorie sans aucun événement, **When** le client la demande, **Then** la réponse est une liste vide, sans erreur.

---

### User Story 2 - Comportement inchangé sans filtre (Priority: P2)

Un client qui ne fournit aucun filtre reçoit tous les événements, comme aujourd'hui.

**Why this priority**: évite de casser les clients existants.

**Independent Test**: demander la liste sans paramètre et comparer à la réponse actuelle.

**Acceptance Scenarios**:

1. **Given** des événements dans plusieurs catégories, **When** le client demande la liste sans paramètre, **Then** tous les événements sont renvoyés, dans le même ordre qu'avant.

---

### User Story 3 - Refus d'une catégorie inconnue (Priority: P3)

Un client qui demande une catégorie qui n'existe pas reçoit une erreur explicite, pas une liste vide trompeuse.

**Why this priority**: une faute de frappe doit être signalée, pas masquée.

**Independent Test**: demander une catégorie inexistante et vérifier le code de réponse et le message.

**Acceptance Scenarios**:

1. **Given** un identifiant de catégorie inexistant, **When** le client demande la liste filtrée, **Then** la réponse est une erreur 400 avec un message explicite.

---

### Edge Cases

- Paramètre `category` vide (`?category=`) : traité comme une valeur inconnue (400).
- Casse différente (`Travail` au lieu de `travail`) : traité comme une valeur inconnue (400), pas corrigé en silence.
- Plusieurs paramètres `category` dans la même requête : refusés (400) plutôt que choisir l'un d'eux.
- Événement sans catégorie stockée : rattaché à `autre`, comme le reste de l'application.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Le système MUST permettre de filtrer la liste des événements par une catégorie unique, passée en paramètre de requête.
- **FR-002**: Le système MUST accepter uniquement les six identifiants de catégorie existants (`personnel`, `travail`, `important`, `famille`, `loisirs`, `autre`).
- **FR-003**: Le système MUST renvoyer une erreur 400 au format `{ "errors": ["..."] }` (même format que la validation des corps) avec un message explicite pour toute autre valeur, y compris une valeur vide, une casse différente ou un paramètre répété.
- **FR-004**: Sans paramètre de filtre, le système MUST renvoyer tous les événements, avec le même contenu et le même ordre qu'avant cette fonctionnalité.
- **FR-005**: Le filtre MUST ne renvoyer que les événements dont la catégorie correspond exactement, sans inclure de sous-catégorie ni de correspondance partielle.

### Key Entities *(include if feature involves data)*

- **Événement** : possède une catégorie parmi les six identifiants ; une catégorie absente est lue comme `autre`.
- **Catégorie** : identifiant fermé (six valeurs), déjà défini dans l'application.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Pour une catégorie donnée, 100 % des événements renvoyés appartiennent à cette catégorie, et aucun événement de cette catégorie n'est omis.
- **SC-002**: Une requête sans filtre renvoie exactement la même liste qu'avant la fonctionnalité (même contenu, même ordre).
- **SC-003**: 100 % des valeurs hors liste fermée sont refusées avec une erreur explicite, aucune n'est ignorée silencieusement.

## Assumptions

- Le filtre porte sur une seule catégorie à la fois ; le multi-catégories est hors périmètre.
- Pas de changement d'interface utilisateur : la fonctionnalité est uniquement côté API.
- Pas de pagination ajoutée : la liste reste complète, comme aujourd'hui.
- La liste fermée des catégories reste celle déjà définie côté serveur, sans nouvelle catégorie.
