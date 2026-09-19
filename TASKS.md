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
- [x] T22 — Create `interactions` table
- [x] T23 — Implement server-side persistence helpers

## Phase 5 — First Vertical Slice

- [x] T24 — Connect N1 end-to-end
- [x] T25 — Verify N1 DB record
- [x] T26 — Test N1 advanced path
- [x] T27 — Test N1 medium path
- [x] T28 — Test N1 weak path

## Phase 6 — Main Scenario

- [x] T29 — Implement/evaluate N2
- [x] T30 — Implement/evaluate N3
- [x] T31 — Implement/evaluate N4 (including N4_REV substep)
- [x] T32 — Implement/evaluate N5
- [x] T33 — Implement END

## Phase 7 — Hint / Rescue

- [x] T34 — Implement N1_H
- [x] T35 — Implement N1_F rescue
- [x] T36 — Implement N2_H
- [x] T37 — Implement N3_H
- [x] T38 — Implement N4_H
- [x] T39 — Implement N5_H
- [x] T40 — Test full struggling-student path

## Phase 8 — Reliability

- [x] T41 — Reject empty input
- [x] T42 — Prevent double submit
- [x] T43 — Handle AI evaluator technical failure without advancing
- [x] T44 — Validate structured output
- [x] T45 — Add reasonable answer-length limit
- [x] T46 — Restore active session after refresh

## Phase 9 — Research Verification

- [x] T47 — Run complete strong-student path manually
- [x] T48 — Run complete weak/rescue path manually
- [x] T49 — Verify stored interactions manually
- [x] T50 — Export sample CSV and confirm researcher can analyze it
- [x] T51 — Verify no student Score is displayed

## Phase 10 — Pilot & Freeze

- [x] T52 — Run pilot
- [x] T53 — Record pilot issues
- [x] T54 — Fix only approved pilot issues
- [x] T54.1 — Freeze sequential five-scenario specification
- [x] T54.2 — Add student identity + sequential journey foundation
- [ ] T54.3 — Implement scenarios 2 and 3
- [ ] T54.4 — Implement scenarios 4 and 5
- [ ] T54.5 — Add researcher report and verify full journey
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
