# Codex task workflow

Use the **Codex task** issue form for work that Codex may implement. All form sections are mandatory; the validation workflow checks their presence when `codex-ready` is added.

## Status labels

Only one of these labels should be present at a time:

| Label | Meaning | Set by |
| --- | --- | --- |
| `codex-ready` | Complete, unambiguous, and queued for Codex | Human |
| `codex-working` | Claimed and actively being implemented | Codex |
| `codex-review` | Draft PR is open and checks have been reported | Codex |
| `blocked` | Clarification, access, or another external decision is required | Codex or human |
| `done` | Human-reviewed work is complete | Human |

Normal flow: `codex-ready` → `codex-working` → `codex-review` → `done`.

Use `blocked` from any active state when work cannot safely continue. After resolving the blocker, a human returns the issue to `codex-ready`. Codex must stop if it cannot make the required label transition and must never apply `done` itself.

## Repository setup

Create these five labels once in the repository settings using the exact lowercase names above. Suggested colors are `0e8a16`, `fbca04`, `1d76db`, `d73a4a`, and `5319e7`, respectively.

The validator has read-only repository and issue permissions. It reports malformed ready tasks as a failed check; it does not edit issues, labels, branches, or `main`.
