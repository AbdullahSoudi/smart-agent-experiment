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
