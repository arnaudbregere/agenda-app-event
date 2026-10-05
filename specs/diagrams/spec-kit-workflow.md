# Workflow spec-kit

Export PDF : [spec-kit-workflow.pdf](spec-kit-workflow.pdf).

Cycle de vie d'une feature avec spec-kit (`.specify/`, skills `speckit-*`). Chaque étape produit un artefact dans `specs/<NNN>-<nom>/`.

```mermaid
flowchart TD
    constitution["Constitution : .specify/memory/constitution.md"] -.->|"lue par toutes les étapes"| specify

    specify["/speckit-specify"] -->|"crée"| spec["spec.md + checklists/requirements.md"]
    spec --> clarify["/speckit-clarify (max 5 questions)"]
    clarify -->|"met à jour"| spec
    clarify --> plan["/speckit-plan"]
    plan -->|"crée"| planart["plan.md, research.md, data-model.md, contracts/, quickstart.md"]
    planart --> tasks["/speckit-tasks"]
    tasks -->|"crée"| tasksmd["tasks.md (phases, [P], [US1]...)"]
    tasksmd --> implement["/speckit-implement"]
    implement -->|"coche les tâches [X]"| tasksmd
    implement --> pr["Branche feat/ + PR vers main"]

    analyze["/speckit-analyze"] -.->|"contrôle optionnel"| tasksmd
    converge["/speckit-converge"] -.->|"ajoute le travail restant"| tasksmd
```

## Points de contrôle

| Étape | Porte d'entrée | Sortie |
|---|---|---|
| specify | description libre | spec validée contre la checklist (pas de `[NEEDS CLARIFICATION]` restant) |
| clarify | spec avec ambiguïtés | réponses intégrées dans `## Clarifications` |
| plan | spec clarifiée | Constitution Check PASS |
| tasks | plan et contrats | tâches numérotées, groupées par user story |
| implement | checklists cochées | toutes les tâches `[X]`, tests et typecheck verts |

Les règles de passage avec `/impeccable shape` (features UI) sont dans `CLAUDE.md`, section « Design et agents ».
