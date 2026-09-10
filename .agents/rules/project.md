# Smart Agent Project Rules

This is a small academic research experiment.

Keep the solution simple.

---

## GROUNDING RULES — MANDATORY

1. Project files are the source of truth.
2. Always read the relevant project files before planning or editing.
3. Do not invent, infer, complete, or "improve" missing research requirements using your own knowledge.
4. Do not change educational wording, rubrics, transitions, branching behavior, or research logic unless explicitly approved in the project files or by the user.
5. If information is missing or ambiguous, STOP and ask instead of guessing.
6. If project files conflict, STOP and report the conflict instead of silently choosing one.
7. Do not use generic best practices to override explicit project requirements.
8. Do not add features, frameworks, dependencies, abstractions, or architecture that are not required by the current task.
9. Work on one TASKS.md item at a time unless the user explicitly approves otherwise.
10. When making an implementation decision, ground it in the relevant project file.

---

## SOURCE OF TRUTH PRIORITY

For educational and research behavior:
`SCENARIO_SPEC.md`

For Gemini evaluation behavior:
`AI_EVALUATION.md`

For project scope and architecture:
`PROJECT.md`

For task order:
`TASKS.md`

For agent working constraints:
`.agents/rules/project.md`

### Decision policy:

- Known requirement -> implement exactly
- Missing requirement -> ask
- Conflicting requirement -> report
- Nice-to-have idea -> do not implement

**IMPORTANT:**
Do not redesign or "improve" the project on your own.
Your job is to implement the approved specification faithfully.

---

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

---

## Git and GitHub Workflow

1. After an approved task is successfully implemented and verified, handle the Git commit and push automatically.

2. Before committing:
   - run `git status`
   - inspect `git diff`
   - verify that only files related to the current task were changed
   - run the relevant project checks
   - do not commit if verification fails

3. If unrelated or unexpected modified files exist:
   STOP and ask before committing.

4. Stage only files related to the current approved task.
   Do not blindly stage unrelated files.

5. Use a concise descriptive commit message that reflects the completed task.

Examples:
- `docs: freeze scenario specification v1.0`
- `test: add N1 evaluation dataset`
- `feat: add Gemini N1 evaluator`
- `feat: implement N1 scenario flow`
- `fix: handle Gemini evaluation failure`

6. After a successful commit, push to the existing configured remote branch.

Default expected workflow:

`git status`
→ inspect diff
→ verification
→ `git add <relevant files>`
→ `git commit -m "<descriptive message>"`
→ `git push`

7. Never perform destructive or history-rewriting Git operations unless the user explicitly asks.

Forbidden without explicit approval:
- `git push --force`
- `git push -f`
- `git reset --hard`
- destructive `git clean`
- interactive rebase
- rewriting published commits
- deleting branches
- deleting tags

8. Do not modify:
- Git remote URLs
- GitHub repository settings
- global Git configuration
- GitHub authentication

unless explicitly requested.

9. Do not create a new GitHub repository if an `origin` remote already exists.

10. Never commit:
- API keys
- passwords
- access tokens
- `.env`
- `.env.local`
- other secrets

11. If `git push` fails:
   - report the exact failure
   - do not use force push as a workaround
   - do not change repository configuration on your own

12. A task is not considered fully complete until:
   - implementation is verified
   - relevant changes are committed
   - the commit is successfully pushed to the configured GitHub remote

**IMPORTANT:**
Git automation does not give permission to expand task scope.
Only commit and push work that belongs to the currently approved task.
