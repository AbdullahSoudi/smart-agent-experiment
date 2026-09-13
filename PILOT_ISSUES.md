# Pilot Evaluation & Issues Log (Phase 10 — T53)

## 1. Executive Summary & Metadata

- **Task Reference:** `T53 — Record pilot issues` (following `T52 — Run pilot`)
- **Pilot Date:** September 2026
- **Test Participant / Evaluator:** Project Owner (Live Human Pilot Session `PILOT_01`)
- **Live Pilot Session ID:** `9a680f95-a180-4dd6-9951-b26860a098c3`
- **Technical Baseline at Pilot:**
  - `scenario_version`: `1.0`
  - `prompt_version`: `0.2`
  - `provider`: `groq`
  - `model_id`: `openai/gpt-oss-120b`
  - Total Sessions in DB: 24 (23 pre-pilot development fixtures + 1 human pilot session)
  - Total Interactions in DB: 81 (74 pre-pilot + 7 human pilot interactions)
- **Pilot Outcome:**
  - **Technically Functional:** The web application executed reliably. Session initialization, state persistence, Groq API inference, and hidden scoring invariants functioned properly without system crashes.
  - **Instructional & UX Issues Identified:** Live human interaction revealed three significant usability, conversational, and pedagogical friction points that must be addressed before the final experiment freeze.
- **Project Owner Approval:** All three recorded issues and their proposed architectural directions have been formally approved by the project owner for remediation in `T54`.

---

## 2. Empirical Pilot Observations (`PILOT_01`)

The live human pilot session `PILOT_01` exercised nodes `N1`, `N1_H`, `N1_F`, `N2`, and `N3`. The conversation was halted at `N3` due to conversational rigidity and communication barriers.

### Key Observed Interaction Milestones:
1. **Turn 1 (`N1`):** Student submitted `"هختار فكرة وهحاول اقنع الناس يشتروها"`. Correctly classified as `weak` and routed to hint `N1_H`.
2. **Turn 2 (`N1_H` — Conversational Breakdown 1):**
   - The student expressed genuine confusion and asked for clarification: `"مش فاهم"`.
   - **System Behavior:** The evaluator treated this meta-conversational plea as an assessable answer, classified it as `weak`, and deterministically triggered the fallback rescue node `N1_F`.
   - **Impact:** The student was penalized for asking for help instead of receiving supportive clarification.
3. **Turn 3 (`N1_F`):** Student selected option `"تصميم تطبيق متطور ثم البحث عمن يشتريه."` and progressed to `N2`.
4. **Turn 4 (`N2`):** Student answered `"الفئة العمرية للعملاء المستهدفين"`, classified as `weak`, routed to `N2_H` auto-continue to `N3`.
5. **Turn 6 (`N3`):** Student answered `"الفجوة هي انهم مش قادرين يوصلوا للمصادر"`, classified as `medium`, routed to `N3_H`.
6. **Turn 7 (`N3_H` — Conversational Breakdown 2):**
   - The student requested simpler, dialect-appropriate language: `"ممكن تتكلم معايا مصري عشان افهم اكتر"`.
   - **System Behavior:** The evaluator again evaluated this request as an academic answer, classified it as `weak`, and routed the student backward to `N2_H`.
   - **Impact:** The session regressed, creating frustration and making the system feel like an unyielding rubric form rather than an intelligent mentor.

---

## 3. Detailed Pilot Issues

### Issue 1: Conversational Rigidity (Help Requests Evaluated as Answers)
- **Severity:** HIGH
- **Category:** RESEARCH / UX / INSTRUCTIONAL
- **Observed Behavior:**
  - The agent behaves as a rigid, rubric-driven evaluation form rather than a natural mentor.
  - It expects specific educational domain content in every student turn before allowing progression or assistance.
  - When students express confusion (e.g., `"مش فاهم"`) or ask for different explanations (e.g., `"ممكن تتكلم معايا مصري عشان افهم اكتر"`), the system classifies the message as `weak`.
  - This traps students in repeating failure loops or forces deterministic rescue branches prematurely.
- **Approved Direction for T54:**
  - Introduce an **intent-aware conversational layer**.
  - The AI evaluator must categorize student turns into at least three intents:
    1. `answer`: A genuine attempt to answer the station's educational challenge. Evaluated as `advanced` | `medium` | `weak`.
    2. `support`: A request for clarification, rephrasing, help, or an expression of confusion. Classification must be `null`.
    3. `off_topic`: Non-relevant commentary or banter. Classification must be `null`.
  - When `intent === "support"` or `intent === "off_topic"`, the mentor generates a helpful, conversational response, and the student **remains at the current node** without triggering state transitions or counting as an answer failure.
  - Deterministic state routing remains strictly application-owned: state transitions fire only when `intent === "answer"`.

---

## 4. Issue 2: Academic & Unnecessarily Complex Language
- **Severity:** HIGH
- **Category:** CONTENT CLARITY / INSTRUCTIONAL UX
- **Observed Behavior:**
  - Station prompts and feedback rely on formal academic terminology (e.g., "القيمة المقدمة", "الفجوة في الحلول الحالية", "الجدوى الاقتصادية") that created cognitive overload for undergraduate participants.
  - The agent repeated formal phrasing rather than adapting to the student's level of comprehension.
- **Approved Direction for T54:**
  - The mentor must communicate in simple, student-friendly Arabic using short sentences, one clear concept per turn, and concrete examples.
  - Support natural Egyptian Arabic when requested or naturally introduced by the student.
  - Approved illustrative simplifications:
    - Replace *"ما القيمة المقدمة التي سيحصل عليها العميل؟"* with *"إيه الفايدة اللي الطالب هياخدها من فكرتك؟"*
    - Replace *"ما الفجوة التي يمكن لمشروعك استغلالها؟"* with *"إيه الحاجة الناقصة دلوقتي ومشروعك ممكن يحلها؟"*
    - Replace *"هل يمكن أن تتحول هذه الفرصة إلى قيمة اقتصادية؟"* with *"هل الفكرة دي ممكن تكسب منها فلوس أو تستمر كمشروع؟"*
  - Adopt **progressive scaffolding**: (1) simpler rephrase → (2) relatable example → (3) break down into smaller sub-questions → (4) partial scaffold.

---

## 5. Issue 3: Interface Does Not Feel Like an Intelligent Chatbot
- **Severity:** HIGH
- **Category:** UX / FRONTEND
- **Observed Behavior:**
  - The chat interface was structured as a segmented workflow/form (visible station titles, node codes like `N1`/`N3_H`, "المحطة التالية", separate card blocks for prompts, answers, and feedback).
  - This layout exposed the underlying state machine mechanics and felt mechanical and intimidating rather than conversational.
- **Approved Direction for T54:**
  - Redesign `/chat` into a clean, modern, student-friendly AI chat interface.
  - **Interaction Model:**
    - Clean, uncluttered header without internal debug tags or state-machine labels.
    - Single, continuous message stream with distinct student and mentor speech bubbles.
    - Feedback integrated naturally as sequential assistant messages rather than separate "ملاحظة المرشد" cards.
    - Sticky bottom composer with auto-growing input, `Enter` to submit, `Shift+Enter` for newline.
    - Smooth auto-scroll to the latest message.
    - Responsive RTL layout with high accessibility and clear visual hierarchy.
    - Completely hide all node codes (`N1`, `N2`, `N3_H`), "المحطة التالية", and rescue-state terminology.
  - **Visual Design Identity:** Retain the project's calm, focused palette (warm off-white/paper background, deep forest accents, charcoal typography, subtle brass highlights).

---

## 6. Approved Architectural Principles for T54 Implementation

The project owner has approved the following architectural constraints for the upcoming `T54` task:

1. **Architecture Preservation:**
   - Retain the Next.js App Router, TypeScript, Supabase persistence layer, and Groq inference engine.
   - Do NOT introduce heavyweight external frameworks (no LangChain, LangGraph, vector DBs, or multi-agent runtimes).
2. **Separation of Concerns:**
   - **AI Responsibility:** Natural language understanding, intent recognition (`answer`, `support`, `off_topic`), Arabic conversational reply, and answer classification when applicable.
   - **Application Responsibility:** Deterministic node transitions via `getNextNode()`, session lifecycle, database persistence, and invariant enforcement. The AI will not select or output `next_node`.
3. **Conversational Context Management:**
   - Provide the evaluator with bounded conversational context: current node description, current rubric, and recent messages within the current node.
   - Avoid unbounded message history payloads to conserve token budget and maintain deterministic behavior.
4. **Data Persistence & Schema Minimization:**
   - Store both evaluated answers and conversational support turns to preserve the complete research record.
   - Choose the minimal schema change necessary (e.g., adding a `turn_kind` or similar indicator to `interactions`) without altering core table relationships.
5. **Rigorous Versioning:**
   - Changes in T54 constitute an evolution of the educational intervention.
   - Historical records (`PILOT_01` and Phase 9 verification fixtures) must remain completely untouched.
   - T54 will apply explicit version bumps (e.g., to `prompt_version` and/or `scenario_version`) in accordance with project standards.

---

## 7. Phase 10 Status Tracking

- [x] **T52 — Run pilot:** **COMPLETE** (Conducted with Project Owner via session `PILOT_01`)
- [x] **T53 — Record pilot issues:** **COMPLETE** (Documented herein with Project Owner approval)
- [ ] **T54 — Fix only approved pilot issues:** **INCOMPLETE** (Ready for implementation)
- [ ] **T55 — Freeze App / Scenario / Prompt / Model versions:** **INCOMPLETE**
- [ ] **T56 — Tag experiment release v1.0:** **INCOMPLETE**