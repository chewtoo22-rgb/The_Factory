# Agent Communication Protocol

## Purpose

The Factory is a team, not a collection of isolated bots. Agents communicate by publishing structured task events and durable artifacts. Human-readable GitHub logs are mandatory.

## Agent identity

Every message carries:

- `agent`: stable agent name
- `task_id`: globally unique task identifier
- `mission_id`: parent mission
- `timestamp`: UTC ISO-8601 timestamp
- `status`: lifecycle status
- `summary`: concise statement of the event
- `evidence`: links, commit SHAs, PRs, test results, deployment IDs, or other proof
- `next_action`: what another agent should do next

## Event types

- `TASK_CLAIMED`
- `PROGRESS`
- `BLOCKED`
- `HANDOFF`
- `TASK_COMPLETED`
- `TASK_FAILED`
- `AUDIT_STARTED`
- `AUDIT_PASSED`
- `AUDIT_REJECTED`
- `ESCALATED`

## Handoffs

A handoff must explicitly name the receiving agent and provide enough context to continue without guessing. The sender remains accountable for the accuracy of the handoff.

## GitHub logging rule

For every `TASK_COMPLETED` event, create `factory-log/YYYY/MM/<task_id>.md` in the GitHub repository. The log is committed as part of the completion transaction whenever possible. If a commit cannot be created, the task is `BLOCKED` rather than silently completed.

For material code work, also reference the branch/commit/PR in the task log.

## Communication priority

1. Oompa audit/rejection
2. Security or production incident
3. Blocker requiring another agent
4. Task handoff
5. Normal progress

Oompa may interrupt any lower-priority workflow when it detects unacceptable drift or risk.
