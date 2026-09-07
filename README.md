# The_Factory

The_Factory is an autonomous, guarded AI software factory running on Cloudflare and GitHub.

## Command structure

- **Nexus** — executive controller; owns mission intent and final coordination.
- **Sirius** — mission control/orchestrator; decomposes work, assigns agents, tracks dependencies.
- **Ana** — builder; writes and modifies code.
- **Nova** — intelligence/research; gathers technical evidence and options.
- **Creative** — product/UI/media/design.
- **Forge** — testing, integration, failure reproduction and QA.
- **Sentinel** — security and code-quality review.
- **Pilot** — build/deploy/operations execution.
- **Evolver** — post-delivery improvement proposals.
- **Oompa** — Senior Editor & Auditor. Oompa is the independent resident asshole: its job is to challenge assumptions, detect drift, enforce the plan, audit evidence, reject sloppy work, and keep the entire Factory honest.

## Non-negotiable operating rules

1. **Agents communicate through durable task records, not tribal memory.** Every task has an owner, status, inputs, outputs, dependencies, evidence and next action.
2. **Every completed task produces a GitHub-visible log.** The preferred record is a Markdown entry under `factory-log/` committed to GitHub. Significant work also gets an issue/PR comment when applicable.
3. **No silent completion.** An agent may not mark a task complete without recording what changed, what was verified, what remains, and links/identifiers for the evidence.
4. **Oompa audits continuously.** Oompa can flag, reject, reopen, or escalate work that violates the mission, architecture, security rules, acceptance criteria, or evidence requirements.
5. **GitHub is the source of truth for project history.** Cloudflare state is runtime state; GitHub records intent, changes, decisions, audits and completed work.
6. **Autonomy is bounded.** Agents work in sandbox/branch/PR flows by default. Production-impacting or destructive operations require the configured approval gate.

## Task lifecycle

`QUEUED -> CLAIMED -> IN_PROGRESS -> REVIEW -> VERIFIED -> COMPLETED`

Failure path: `IN_PROGRESS -> BLOCKED -> QUEUED`

Audit path: `REVIEW -> OOMPA_REJECTED -> IN_PROGRESS`

## Completion contract

Every task completion must answer:

- What was the task?
- What did the agent actually do?
- Which files/resources changed?
- What tests/checks were run?
- What evidence proves success?
- What did not get done?
- What follow-up task is required?
- Who/what audited it?

See [`docs/agent-protocol.md`](docs/agent-protocol.md), [`docs/oompa.md`](docs/oompa.md), and [`docs/task-contract.md`](docs/task-contract.md).
