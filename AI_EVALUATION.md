# AI EVALUATION CONTRACT

## 1. الهدف

هذا الملف يحدد بالضبط ما نطلبه من النموذج الذكي (AI Evaluator) في كل إجابة Free-text.

المزود المعتمد حاليًا: Groq
النموذج المعتمد: `openai/gpt-oss-120b` (تم الانتقال إليه بسبب قيود الحصة المجانية لمزود Gemini).

النموذج ليس Scenario Engine.

---

## 2. Input to AI Evaluator

في كل تقييم نرسل فقط الحد الأدنى المطلوب:

- Current node ID
- Node question/context
- Learning goal
- Rubric:
  - advanced
  - medium
  - weak
- Student answer
- Feedback constraints

لا ترسل Conversation History كاملة بشكل افتراضي.

إذا احتاجت عقدة معلومة من إجابة سابقة، أرسل فقط المعلومة المطلوبة بعد اعتماد التصميم.

---

## 3. Required Output

النموذج يجب أن يعيد Structured Output فقط بالمفهوم التالي:

```json
{
  "classification": "advanced",
  "feedback": "..."
}
```

### Allowed classification

- `advanced`
- `medium`
- `weak`

ممنوع أي قيمة رابعة.

---

## 4. Explicitly Forbidden Output Responsibilities

النموذج لا يحدد:

- `next_node`
- Score نهائي
- Hint level
- Scenario rules
- New learning objective
- Whether the experiment ends

التطبيق يحدد كل ذلك.

---

## 5. Feedback Rules

الـFeedback:

- باللغة العربية.
- قصير.
- مرتبط مباشرة بإجابة الطالب.
- يدعم التفكير ولا يحاضر الطالب.
- لا يعرض classification للطالب.
- لا يقول "advanced / medium / weak".
- لا يعرض Score.
- لا يخترع معلومات خارج العقدة.
- لا يعطي الحل النهائي مباشرة إلا إذا كان السياق Rescue معتمدًا في `SCENARIO_SPEC.md`.

يفضل 1–3 جمل.

---

## 6. Validation

التطبيق يجب أن يتحقق من:

- `classification` ضمن enum المسموح.
- `feedback` نص غير فارغ.
- حجم Feedback ضمن حد منطقي.

إذا عاد Output غير صالح:

1. لا تنتقل للعقدة التالية.
2. حاول Retry تقني واحد فقط عند تطبيق مرحلة Reliability.
3. إذا فشل، أظهر Technical Error للطالب.
4. لا تعتبر المشكلة إجابة خاطئة للطالب.

---

## 7. Evaluation Before Web App

قبل اعتماد النموذج (AI Evaluator):

1. الباحث يصنف مجموعة أمثلة يدويًا.
2. هذه التصنيفات هي Ground Truth.
3. نشغل النموذج على نفس الأمثلة.
4. نسجل mismatches.
5. نعدل Prompt أو Rubric فقط بعد مراجعة الباحث.
6. لا نغير Ground Truth لكي "ينجح" النموذج.

ابدأ بـN1 قبل بناء باقي الموقع.

---

## 8. Versioning

أثناء التطوير:

- Prompt يمكن تعديله.
- Model يمكن تغييره للاختبار.

قبل الـPilot النهائي والتجربة:

- اختر Exact model ID.
- ثبت Prompt version.
- ثبت Scenario version.

مثال:

```text
Scenario: 1.0
Prompt: 1.2
Provider: Groq
Model: openai/gpt-oss-120b
App: 1.0.0
```


---

## 7. Conversational Intent Contract (Prompt v0.3 — T54 Pilot Evolution)

في الإصدار 0.3 (المعتمد للجلسات الجديدة ابتداءً من T54)، يتعامل النموذج بمرونة حوارية تمنع تصنيف طلبات المساعدة بالخطأ كإجابات ضعيفة:

### مخرجات النموذج الهيكلية (Strict JSON Schema)
```json
{
  "intent": "answer | support | off_topic",
  "classification": "advanced | medium | weak | null",
  "feedback": "Arabic response string"
}
```

### قواعد التحقق الصارمة (Server-Side Invariants)
- إذا كان `intent = "answer"`: يجب أن يكون `classification` قيمة صحيحة (`advanced` أو `medium` أو `weak`).
- إذا كان `intent = "support"`: يجب أن يكون `classification = null`.
- إذا كان `intent = "off_topic"`: يجب أن يكون `classification = null`.
- **التوجيه والمسار (Routing)**: النموذج لا يختار نهائياً `next_node`. في حالتي الدعم والمحادثة الجانبية يبقى الطالب في نفس المحطة التعليمية.
- **التدرج في الدعم (Progressive Scaffolding)**:
  1. طلب الدعم الأول: تبسيط السؤال وإعادة صياغته بشكل مباشر.
  2. طلب الدعم الثاني: تقديم مثال واقعي ملموس.
  3. طلب الدعم الثالث: تجزئة المطلوب إلى خطوة أصغر.
  4. طلب الدعم الرابع+: تقديم قالب مبسط وإكمال الطالب للباقي.
- **التكيف مع اللهجة المصرية**: عند طلب الطالب أو حديثه بالمصري، يرد الوكيل بمصرية مهذبة وبسيطة بدون تكلف.
