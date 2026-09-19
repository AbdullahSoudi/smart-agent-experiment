# Sequential Five-Scenario Journey Specification

> This document defines the overall sequential journey structure.
> Individual scenario details are in `scenario-1.md` through `scenario-5.md`.

---

## Journey Order (MANDATORY — No Random Assignment)

Every participant completes ALL five scenarios in this exact order:

| Order | ID | Skill Title | Primary Interaction Mode |
|---|---|---|---|
| 1 | S1 | اكتشاف الفرص الرقمية | Conversational adaptive branching |
| 2 | S2 | توليد الأفكار الابتكارية | Conversational cognitive-provocation sequence |
| 3 | S3 | بناء وتخطيط نموذج العمل التجاري | Structured input + conversational logical auditing |
| 4 | S4 | اتخاذ القرار وإدارة المخاطر | Time-bound crisis simulation |
| 5 | S5 | التسويق الرقمي واتخاذ القرارات المبنية على البيانات | A/B testing analytical simulation |

---

## Sequential Transition Between Scenarios

```
S1 END -> mark Skill 1 completed -> enter S2 opening
S2 END -> mark Skill 2 completed -> enter S3 opening
S3 END -> mark Skill 3 completed -> enter S4 opening
S4 END -> mark Skill 4 completed -> enter S5 opening
S5 END -> mark Skill 5 completed -> overall session COMPLETED
```

---

## Session Model

- ONE participant = ONE experiment session
- One session traverses ALL five scenarios sequentially
- No independent sessions per scenario
- No random scenario assignment

### Minimal future session schema additions:

```
existing fields
+
student_name
student_code (existing)
current_scenario (1..5)
```

Participant always starts at `current_scenario = 1` and progresses sequentially.

### Minimal future interaction schema additions:

```
existing fields
+
scenario_id (which of the five sequential scenarios)
```

Do NOT introduce additional progress tables unless the existing schema cannot correctly represent the requirements. Avoid: skills table, scenario_progress table, completed_scenarios table.

---

## Participant Identity

**Required fields:**

- `student_name` — participant's name
- `student_code` — stable participant identifier (existing)

**Behavior:**

| Condition | Action |
|---|---|
| NEW code | Save student name + code, create ONE session, begin S1 |
| EXISTING ACTIVE code | Do not create another session, resume same experiment session / scenario / node |
| EXISTING COMPLETED code | Do not restart experiment, show completion message |
| EXISTING code + conflicting entered name | Do NOT overwrite stored name, stop entry with safe message |

---

## Student-Facing Progress

Minimal semantics (progression information, NOT performance scoring):

```
✓ completed
● active
○ upcoming
```

Example:

```
✓ اكتشاف الفرص الرقمية
● توليد الأفكار الابتكارية
○ بناء وتخطيط نموذج العمل التجاري
○ اتخاذ القرار وإدارة المخاطر
○ التسويق الرقمي
```

**MUST NOT expose:** advanced, medium, weak, classification, internal node IDs, branch IDs, score, mastery percentage, failed-attempt count, support level.

---

## Researcher-Only Analytics Report (FUTURE — T54.5)

The detailed performance/analytics report is RESEARCHER-ONLY. It must NOT be exposed to the participant.

**Participant may see:**
- Current skill
- Completed skills
- Upcoming skills
- Conversational feedback
- Successful experiment completion

**Researcher report requirements (future T54.5):**

Participant level:
- student name, student code, status, started_at, finished_at, total duration

Journey level:
- Five-scenario completion state
- Current skill if incomplete

Scenario level:
- Chronological interactions
- Student answers, agent responses
- Classifications where applicable
- Conversational support requests
- Branch/path information
- Attempts where meaningful

Scenario 4 specific:
- Decision (A/B/C/timeout)
- Response time (seconds)
- Timeout status
- Crisis path
- Recovery choice

Scenario 5 specific:
- Participant campaign decision
- Reasoning
- Correction if required
- Analytical path

Also required: CSV export. Must be protected (researcher-only access).

---

## Common Chat Experience

The participant must still feel they are speaking with an intelligent mentor across all scenarios.

Preserve the T54 conversational intent layer:
- `answer` — genuine educational answer
- `support` — clarification/help request
- `off_topic` — non-relevant commentary

Support and off_topic must NOT rewrite researcher canonical prompts.

---

## AI / Code Responsibility (unchanged)

| Responsibility | Owner |
|---|---|
| Understand Arabic | AI |
| Identify conversation intent | AI |
| Provide support responses | AI |
| Evaluate educational answers | AI |
| Produce conversational feedback | AI |
| Session state | Code |
| current_scenario | Code |
| Current node | Code |
| Deterministic transitions | Code |
| Timers/timeouts | Code |
| Sequential scenario advancement | Code |
| Completion | Code |
| Persistence | Code |

AI must NOT choose arbitrary next scenario or arbitrary next_node outside approved researcher logic.

---

## Architectural Constraints

Preserve:
- Next.js App Router, TypeScript, Supabase, Groq
- Server-side AI, deterministic application-owned routing
- Conversational intent layer
- One experiment session per participant
- Existing security constraints

Do NOT add:
- LangChain, LangGraph, RAG, embeddings, vector DB
- Redis, queues, microservices, WebSockets, separate backend
- LMS, generic scenario platform, workflow engine
- Multi-agent architecture, large admin system

---

## Source Documents

| Scenario | Researcher DOCX Filename |
|---|---|
| S1 | السيناريو الاول اكتشاف الفرص الرقمية.docx |
| S2 | السيناريو الثاني توليد الافكار الابتكارية.docx |
| S3 | السيناريو الثالث تخطيط نموذج العمل التجاري.docx |
| S4 | السيناريو الرابع اتخاذ القرار وإدارة المخاطر.docx |
| S5 | السيناريو الخامس التسويق الرقمي.docx |