# PROJECT — Smart Agent Research Experiment

## 1. Purpose

هذا مشروع ويب بحثي صغير لتجربة ماجستير مع طلاب جامعيين.

الهدف هو تدريب الطالب على **مهارة اكتشاف الفرص الرقمية** داخل سيناريو متفرع، بينما يعمل الـAI Evaluator (المعتمد حاليًا: Groq - openai/gpt-oss-120b) كوكيل ذكي يفسر إجابة الطالب ويقدم تغذية راجعة تكيفية.

هذا المشروع **ليس منصة تعليمية عامة** وليس منتج Chatbot عام.

---

## 2. Research Scope

### Included

- سيناريو واحد فقط: Digital Opportunity Discovery.
- إجابات الطالب الأساسية Free-text باللغة العربية.
- Agent feedback تكيفي.
- Branching حسب قواعد السيناريو.
- Hint / Rescue paths المعتمدة.
- Student Code فقط للتعريف داخل التجربة.
- تخزين التفاعلات المطلوبة للبحث.
- الطالب لا يرى Score أو Performance Level نهائي.

### Research Design

خارج التطبيق:

Pre-test → Web Experiment → Post-test

يستخدم الباحث نفس Student Code للربط بين الأدوات.

---

## 3. AI Evaluator Role

النموذج الذكي (AI Evaluator) مسؤول فقط عن:

1. فهم معنى إجابة الطالب.
2. تصنيف الإجابة:
   - `advanced`
   - `medium`
   - `weak`
3. كتابة Feedback عربي قصير، داعم، مرتبط بالعقدة الحالية.

النموذج غير مسؤول عن:

- اختيار العقدة التالية.
- تعديل السيناريو.
- إنشاء أهداف تعليمية جديدة.
- تغيير Rubric.
- إعطاء Score للطالب.
- البحث على الويب.
- الاحتفاظ بذاكرة طويلة المدى.

---

## 4. Application Role

الكود مسؤول عن:

- Current node.
- Scenario transitions.
- Attempts / hints / rescue flow.
- Session state.
- Persistence.
- Technical validation.
- Completion.

قاعدة حاسمة:

```text
AI Model = understand + classify + feedback
Code   = branch + state + persistence
```

---

## 5. Planned Technology

- Next.js
- TypeScript
- LLM API (Groq - openai/gpt-oss-120b)
- Supabase / PostgreSQL

يُفضل Repository واحد وDeployment واحد في V1.

---

## 6. Planned Data

الحد الأدنى:

### sessions

- id
- student_name (nullable text — added in T54.2)
- student_code
- status
- current_scenario (nullable integer 1..5 — added in T54.2)
- current_node
- scenario_version
- prompt_version
- provider
- model_id
- started_at
- finished_at

### interactions

- id
- session_id
- scenario_id (nullable integer 1..5 — added in T54.2)
- node_id
- student_answer
- classification
- agent_feedback
- next_node
- decision_time_ms
- turn_kind (nullable text: evaluated_answer | conversational_support | off_topic | non_evaluated_answer)
- created_at

### Versioning Matrix

- **Historical Pilot Baseline**: scenario_version = 1.0 | prompt_version = 0.2
- **T54 Conversational Evolution**: scenario_version = 1.1 | prompt_version = 0.3
- **T54.2 Sequential Journey Foundation**: scenario_version = 2.0-dev | prompt_version = 0.3

يتم تخزين اسم الطالب (student_name) وكود المشارك (student_code) لربط جلسة الطالب واستئنافها دون إنشاء جلسات مكررة، مع حظر إعادة تشغيل الجلسات المكتملة وحماية سرية بيانات المشاركين.

---

## 7. Out of Scope — V1

لا تضف أيًا من التالي دون طلب صريح:

- RAG
- Vector database
- Embeddings
- LangChain
- LangGraph
- Multi-agent product architecture
- Voice
- Avatar
- Gamification
- LMS
- Teacher portal
- Student authentication/password system
- Dashboard
- Charts
- Scenario Builder
- Mobile app
- WebSocket
- Redis
- Queue workers
- Microservices
- Fine-tuning
- AI web search
- Complex analytics UI

---

## 8. Research Reproducibility

قبل التجربة الفعلية يتم تثبيت:

- Scenario version
- Prompt version
- Provider (Groq)
- Exact model ID (openai/gpt-oss-120b)
- Application version

لا يتم تعديل السيناريو أو الـRubric أو Prompt أثناء جمع العينة إلا لعطل تقني قهري موثق.

---

## 9. Core Engineering Principle

اختر دائمًا أبسط تنفيذ يحقق الـResearch Requirement.

إذا كان هناك غموض تربوي أو بحثي:

**توقف واسأل. لا تخمّن.**
