# Smart Agent Project Rules

This is a small academic research experiment.

Keep the solution simple.

## Before non-trivial work

1. Read `/PROJECT.md`.
2. Read `/TASKS.md`.
3. If the work affects educational behavior, read `/SCENARIO_SPEC.md`.
4. If the work affects Gemini, read `/AI_EVALUATION.md`.
5. Inspect existing files before proposing changes.
6. Give a short plan before modifying multiple files.

Work on one `TASKS.md` item at a time.

Do not expand scope without explicit approval.

---

## Critical Architecture Rule

Gemini may:

- understand the student's answer
- classify it as advanced / medium / weak
- generate short educational feedback

Gemini MUST NOT:

- decide the next scenario node
- modify scenario rules
- invent branches
- change rubrics
- reveal internal classification or scores to students

Scenario transitions belong to application code.

---

## Research Integrity

`SCENARIO_SPEC.md` is the source of truth for educational behavior.

Never silently change:

- scenario wording
- learning goals
- rubrics
- transitions
- rescue rules

If a research requirement is missing or ambiguous:

STOP and ask.

Do not guess.

---

## Simplicity

Do not introduce unless explicitly requested:

- RAG
- vector databases
- embeddings
- LangChain
- LangGraph
- multi-agent application architecture
- microservices
- Redis
- queues
- WebSockets
- authentication systems
- dashboards
- gamification
- voice
- avatars
- mobile apps
- scenario builders

Prefer the smallest implementation that satisfies the current task.

---

## Secrets

Never expose Gemini or Supabase secret credentials to client-side code.

Do not commit real secrets.

Use environment variables.

---

## Completion

Before claiming a coding task is complete:

1. Run the relevant code/checks.
2. Verify requested behavior.
3. Check for obvious build/type errors.
4. Update `TASKS.md`.
5. Do not claim success without verification.
