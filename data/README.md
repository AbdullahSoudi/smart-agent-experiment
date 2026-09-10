# Evaluation Data

`n1_eval_template.csv` يحتوي على إجابات **اصطناعية** فقط لاختبار الـEvaluator.

هذه ليست بيانات طلاب حقيقية.

## المطلوب من الباحث

املأ عمود:

`researcher_label`

بقيمة واحدة فقط:

- `advanced`
- `medium`
- `weak`

وفق `SCENARIO_SPEC.md`.

لا تجعل Gemini يملأ Ground Truth.

بعد الاعتماد، لا تغيّر الـlabels لمجرد تحسين نسبة النموذج.

---

## Incomplete Gemini Audit Artifact (
1_eval_results_gemini_partial.csv)

- This file records an incomplete Gemini evaluation run on the 24 reference examples.
- Model used: gemini-3.8-flash.
- The run was halted due to external API HTTP 429 quota exhaustion (daily free-tier cap of 20 requests/day per project reached).
- Results: 3 successful evaluations (N1-003, N1-005, N1-010) and 21 technical failures (RESOURCE_EXHAUSTED).
- The 21 technical failures are technical API errors, not incorrect model classifications.
- This artifact must NOT be combined with the final Groq evaluation dataset.
- It is retained strictly as an audit and development history record.
