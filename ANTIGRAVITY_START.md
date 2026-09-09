# ANTIGRAVITY — HOW TO START

## Session 1 — Workspace Sanity Check

بعد فتح المجلد في Antigravity، استخدم هذا الـPrompt أولًا:

```text
Read PROJECT.md, TASKS.md, SCENARIO_SPEC.md, AI_EVALUATION.md, and .agents/rules/project.md.

Do not create or modify any files yet.

Explain back to me concisely:
1. What we are building.
2. What Gemini is responsible for.
3. What application code is responsible for.
4. What is explicitly out of scope.
5. Which research decisions in SCENARIO_SPEC.md still require approval.
6. What the next task in TASKS.md should be.

If any files conflict, identify the conflict instead of guessing.
```

الهدف: التأكد أن Antigravity فهم المشروع قبل كتابة أي كود.

---

## Session 2 — Scenario Review

```text
We are working only on T02.

Read SCENARIO_SPEC.md and list only the items marked RESEARCHER APPROVAL REQUIRED.

Do not rewrite the scenario and do not modify files.

For each unresolved item:
- quote the current source-supported requirement from the spec,
- explain the smallest implementation decision needed,
- give one recommended option,
- explain whether that option changes the research experience.

Stop after the review.
```

اعتمد القرارات مع الباحث ثم حدّث الملف فقط بعد موافقته.

---

## Session 3 — N1 Labelled Dataset

الباحث يفتح:

`data/n1_eval_template.csv`

ويملأ:

`researcher_label`

باستخدام فقط:

- advanced
- medium
- weak

ثم:

```text
Review data/n1_eval_template.csv.

Do not change any researcher labels.

Report:
- unlabeled rows,
- invalid labels,
- duplicate answers,
- examples that appear genuinely ambiguous under N1 rubric.

Do not call Gemini yet.
```

---

## Session 4 — First Coding Task: Gemini N1 Spike

بعد اعتماد السيناريو والـlabels:

```text
We are working only on the first Gemini N1 evaluation spike.

Read PROJECT.md, SCENARIO_SPEC.md, AI_EVALUATION.md, TASKS.md, prompts/gemini_evaluator_prompt.md, and data/n1_eval_template.csv.

Explore the workspace first.

Do not build the web application.
Do not add Supabase.
Do not add RAG or agent frameworks.

Before coding, give me a short plan containing:
- files to create/change,
- the minimal Gemini request,
- structured output validation,
- how the labelled examples will be run,
- how mismatches will be reported.

Stop and wait for approval before implementation.
```

بعد مراجعة الخطة:

```text
Implement only the approved Gemini N1 spike.

Do not expand scope.

Use environment variables for the Gemini credential.
Never expose or commit the key.

Run the labelled N1 evaluation examples and report:
- total labelled examples,
- matches,
- mismatches,
- each mismatched answer with expected vs actual classification.

Do not modify researcher labels.
```

---

## Generic Prompt لأي Task لاحقة

### Explore + Plan

```text
We are working only on [TASK-ID].

Read PROJECT.md, TASKS.md, and all relevant specifications.

Inspect the existing code before changing it.

Do not modify files yet.

Give me a short implementation plan with:
- exact scope,
- files affected,
- acceptance criteria,
- relevant tests/checks,
- explicit out-of-scope items,
- any ambiguity that needs my decision.

Keep the task small.
```

### Implement

```text
Implement only the approved plan for [TASK-ID].

Do not expand scope.
Do not add frameworks or features that were not requested.

Run the relevant checks.
Update TASKS.md only after successful verification.
```

### Quick Review

```text
Review only the changes made for [TASK-ID].

Do not modify files yet.

Look for:
- functional bugs,
- violation of PROJECT.md,
- violation of SCENARIO_SPEC.md,
- Gemini controlling transitions,
- unnecessary complexity,
- missing validation,
- exposed secrets.

Report only actionable issues.
```
