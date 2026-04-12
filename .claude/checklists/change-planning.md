# Change Planning Checklist

Run this before starting a non-trivial task.

## Questions

- Which part of the project does this change touch: data, backend, UI, integrations, or AI?
- Which existing `.claude` playbook should be read first?
- Is there already a pattern in `src/lib/services`, `src/lib/queries`, or `src/lib/schemas` that should be extended instead of duplicated?
- Does this change affect the core reservation -> invoice -> finance demo flow?
- Does the seed or README need updates if this change lands?

## Stop And Redesign If

- the source of truth is unclear
- the task would create another parallel pattern
- the task mixes AI logic with financial mutations
- the task makes the demo less auditable or less deterministic
