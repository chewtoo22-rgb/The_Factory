# Task Contract

```json
{
  "task_id": "factory-000001",
  "mission_id": "mission-000001",
  "agent": "Ana",
  "assigned_by": "Sirius",
  "status": "IN_PROGRESS",
  "objective": "One measurable outcome",
  "acceptance_criteria": [],
  "dependencies": [],
  "inputs": [],
  "outputs": [],
  "evidence": [],
  "handoff_to": null,
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

## Completion requirements

A task cannot enter `COMPLETED` unless:

- acceptance criteria are addressed;
- tests/checks are recorded;
- outputs are identified;
- evidence is attached;
- remaining gaps are explicitly stated;
- the GitHub completion log exists;
- Oompa has either passed the task or the task is explicitly marked as awaiting audit.

`VERIFIED` and `COMPLETED` are intentionally distinct: verification establishes technical evidence; completion establishes that the Factory's process requirements are satisfied.
