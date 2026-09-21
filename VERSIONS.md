# VERSIONS — Experiment Release Freeze (T55)

**Status:** FROZEN

This file records the exact software and AI versions used for the live research experiment.
Do not modify these values after the experiment begins.

---

## Application Version

| Property           | Value                              |
|--------------------|------------------------------------|
| App name           | smart-agent-experiment             |
| App version        | 1.0.0                              |
| Framework          | Next.js 16.x                       |
| Runtime            | Node.js / TypeScript               |
| Pre-freeze commit  | `5996253` (feat: add protected researcher reporting) |
| Release tag        | v1.0                               |

---

## Scenario Version

| Property             | Value                              |
|----------------------|------------------------------------|
| Scenario version     | **2.0**                            |
| Scenario spec file   | `SCENARIO_SPEC.md`               |
| Scenario spec status | FROZEN FOR PILOT (v1.0 spec, v2.0 implementation) |
| Scenarios count      | 5 (sequential, S1 -> S2 -> S3 -> S4 -> S5) |

---

## AI Evaluator Version

| Property           | Value                              |
|--------------------|------------------------------------|
| Prompt version     | **0.3**                            |
| Provider           | Groq                               |
| Model ID           | **openai/gpt-oss-120b**            |
| Evaluator source   | `lib/server/evaluator.ts`        |
| Output schema      | `{ intent, classification, feedback }` (strict JSON) |

---

## DB Schema Identifiers

Values written into the `sessions` table for experiment participants:

| Column             | Frozen value                       |
|--------------------|------------------------------------|
| `scenario_version` | `2.0`                          |
| `prompt_version`   | `0.3`                          |
| `provider`         | `groq`                         |
| `model_id`         | `openai/gpt-oss-120b`          |

---

## Version History (internal)

| Task    | scenario_version | prompt_version | Notes                              |
|---------|-----------------|----------------|------------------------------------|
| T07A    | 1.0             | 0.2            | Historical pilot baseline          |
| T54     | 1.1             | 0.3            | Conversational evaluator upgrade   |
| T54.2   | 2.0-dev         | 0.3            | Sequential 5-scenario foundation   |
| T55     | 2.0             | 0.3            | Experiment release freeze          |
| **T56** | **2.0**         | **0.3**        | **Final experiment release tag v1.0** |

---

## Freeze Policy

Per `PROJECT.md` section 8 (Research Reproducibility):

> لا يتم تعديل السيناريو أو الـRubric أو Prompt أثناء جمع العينة إلا لعطل تقني قهري موثق.
>
> (The scenario, rubric, or prompt shall not be changed during sample collection except for a
> documented, unavoidable technical failure.)

After experiment data collection begins, **do not** change:
- `SCENARIO_SPEC.md`
- `AI_EVALUATION.md`
- `lib/server/evaluator.ts` system instructions
- The model ID in `.env.local`
- Any scenario node wording in `lib/scenario.ts` or `lib/scenarios/*.ts`