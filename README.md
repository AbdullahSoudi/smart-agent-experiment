# Smart Agent Research Experiment — Starter Pack

هذا الـRepository Starter Pack مخصص لتجربة بحثية صغيرة مع طلاب جامعيين حول **اكتشاف الفرص الرقمية** باستخدام وكيل ذكي قائم على Gemini وسيناريو متفرع.

> الهدف: بناء أقل Software ممكن يحقق التجربة البحثية بشكل صحيح وقابل للتكرار.

## ما الذي نبنيه؟

تجربة ويب بسيطة:

Student Code → Scenario Question → Free-text Answer → Gemini Classification + Feedback → Code-controlled Branch → Next Question → END

### المسؤوليات

**Gemini**
- يفهم إجابة الطالب العربية.
- يصنفها: `advanced | medium | weak`.
- ينتج Feedback تعليمي قصير.

**Application Code**
- يعرف العقدة الحالية.
- يحدد العقدة التالية من قواعد السيناريو.
- يدير Hints / Rescue.
- يحفظ بيانات التجربة.

Gemini **لا يحدد `next_node`**.

## الـStack المخطط

- Next.js
- TypeScript
- Gemini API
- Supabase / PostgreSQL

لا يوجد Backend منفصل في V1.

## الملفات المهمة

- `PROJECT.md` — تعريف المشروع وحدوده.
- `SCENARIO_SPEC.md` — مصدر الحقيقة الوحيد للسيناريو.
- `AI_EVALUATION.md` — عقد التقييم بين التطبيق وGemini.
- `TASKS.md` — ترتيب العمل.
- `.agents/rules/project.md` — قواعد Antigravity.
- `ANTIGRAVITY_START.md` — أول Prompts للعمل.
- `data/n1_eval_template.csv` — أمثلة اصطناعية ليصنفها الباحث يدويًا قبل اعتماد Gemini.
- `prompts/gemini_evaluator_prompt.md` — مسودة Prompt للـAI Spike.
- `.env.example` — أسماء المتغيرات السرية المطلوبة لاحقًا.

## البداية

1. فك الضغط وافتح المجلد في Antigravity.
2. شغّل:
   ```bash
   git init
   ```
3. لا تنشئ Next.js الآن.
4. اقرأ `PROJECT.md` و`SCENARIO_SPEC.md`.
5. راجع قسم **Researcher approval required** داخل `SCENARIO_SPEC.md`.
6. اطلب من الباحث تصنيف أمثلة `data/n1_eval_template.csv`.
7. استخدم أول Prompt الموجود في `ANTIGRAVITY_START.md`.
8. أول كود حقيقي يجب أن يكون **Gemini N1 evaluation spike**، وليس الـWeb App.

## قاعدة Scope

أي Feature غير مطلوبة لتشغيل السيناريو أو حفظ بيانات التجربة تُعتبر خارج V1 حتى يثبت العكس.
