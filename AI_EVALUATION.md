# AI EVALUATION CONTRACT

## 1. الهدف

هذا الملف يحدد بالضبط ما نطلبه من Gemini في كل إجابة Free-text.

Gemini ليس Scenario Engine.

---

## 2. Input to Gemini

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

Gemini يجب أن يعيد Structured Output فقط بالمفهوم التالي:

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

Gemini لا يحدد:

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

قبل اعتماد Gemini:

1. الباحث يصنف مجموعة أمثلة يدويًا.
2. هذه التصنيفات هي Ground Truth.
3. نشغل Gemini على نفس الأمثلة.
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
Model: <exact-stable-model-id>
App: 1.0.0
```
