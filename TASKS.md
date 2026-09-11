# TASKS

> قاعدة العمل: Task واحدة في كل مرة. لا توسع Scope أثناء التنفيذ.

## Phase 0 — Research Specification

- [x] T01 — Review and approve `PROJECT.md`
- [x] T02 — Review all researcher-approval notes in `SCENARIO_SPEC.md`
- [x] T03 — Freeze `SCENARIO_SPEC.md` as Scenario v1.0
- [x] T04 — Researcher labels `data/n1_eval_template.csv`

## Phase 1 — Highest-Risk AI Spike

- [x] T05 — Create minimal Node/Classification TypeScript types
- [x] T06 — Create Gemini N1 evaluation script
- [x] T07 — Enforce structured output: classification + feedback
- [x] T07A — Migrate evaluator provider from Gemini to Groq
  - Migration due to Gemini technical daily quota limitation (HTTP 429), not evaluation accuracy.
  - Approved provider: Groq.
  - Approved model ID: `openai/gpt-oss-120b`.
  - Enforce native strict structured output with JSON schema.
  - Retain local validation and exact N1 prompt/rubric.
- [x] T08 — Run N1 labelled examples
- [x] T09 — Review N1 mismatches and document project-owner decisions
- [x] T10 — Approve N1 evaluator behavior

**Gate:** لا تبدأ الـWeb App قبل قبول نتيجة N1.

## Phase 2 — Web Scaffold

- [x] T11 — Scaffold Next.js + TypeScript
- [x] T12 — Add `.env.local` from `.env.example`
- [x] T13 — Implement scenario data
- [x] T14 — Implement deterministic `getNextNode()`
- [x] T15 — Add lightweight transition tests

## Phase 3 — Basic UI

- [x] T15A — Add and activate frontend-design skill for UI work
  - This task must be completed before T16.
  - Use a workspace skill under `.agents/skills/frontend-design/`.
  - The skill is for visual/design quality only.
  - It must not override `PROJECT.md`, `SCENARIO_SPEC.md`, or project scope.
  - It must not introduce unnecessary features, animations, dependencies, dashboards, gamification, or scope expansion.
  - The UI must remain Arabic-first, RTL, simple, research-focused, and mobile-friendly.
  - Do not implement the UI during T15A; activation and design-direction preparation only.
- [x] T16 — Student Code start screen
- [x] T17 — Chat screen with mock data
- [x] T18 — Completion screen
- [x] T19 — Verify RTL/mobile/basic loading states

## Phase 4 — Persistence

- [x] T20 — Create Supabase project
- [x] T21 — Create `sessions` table
- [ ] T22 — Create `interactions` table
- [ ] T23 — Implement server-side persistence helpers

## Phase 5 — First Vertical Slice

- [ ] T24 — Connect N1 end-to-end
- [ ] T25 — Verify N1 DB record
- [ ] T26 — Test N1 advanced path
- [ ] T27 — Test N1 medium path
- [ ] T28 — Test N1 weak path

## Phase 6 — Main Scenario

- [ ] T29 — Implement/evaluate N2
- [ ] T30 — Implement/evaluate N3
- [ ] T31 — Implement/evaluate N4 (including N4_REV substep)
- [ ] T32 — Implement/evaluate N5
- [ ] T33 — Implement END

## Phase 7 — Hint / Rescue

- [ ] T34 — Implement N1_H
- [ ] T35 — Implement N1_F rescue
- [ ] T36 — Implement N2_H
- [ ] T37 — Implement N3_H
- [ ] T38 — Implement N4_H
- [ ] T39 — Implement N5_H
- [ ] T40 — Test full struggling-student path

## Phase 8 — Reliability

- [ ] T41 — Reject empty input
- [ ] T42 — Prevent double submit
- [ ] T43 — Handle AI evaluator technical failure without advancing
- [ ] T44 — Validate structured output
- [ ] T45 — Add reasonable answer-length limit
- [ ] T46 — Restore active session after refresh

## Phase 9 — Research Verification

- [ ] T47 — Run complete strong-student path manually
- [ ] T48 — Run complete weak/rescue path manually
- [ ] T49 — Verify stored interactions manually
- [ ] T50 — Export sample CSV and confirm researcher can analyze it
- [ ] T51 — Verify no student Score is displayed

## Phase 10 — Pilot & Freeze

- [ ] T52 — Run pilot
- [ ] T53 — Record pilot issues
- [ ] T54 — Fix only approved pilot issues
- [ ] T55 — Freeze App / Scenario / Prompt / Model versions
- [ ] T56 — Tag experiment release v1.0

---

## Definition of Done — لكل Coding Task

- [ ] المطلوب المحدد فقط تم تنفيذه
- [ ] لا يوجد Scope expansion
- [ ] السلوك تم تشغيله فعليًا
- [ ] TypeScript/build غير مكسور
- [ ] Relevant test/check تم تشغيله
- [ ] لا توجد Secrets في source code
- [ ] `TASKS.md` تم تحديثه
- [ ] التغيير جاهز لـGit commit
