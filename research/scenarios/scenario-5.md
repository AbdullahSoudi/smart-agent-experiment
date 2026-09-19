# السيناريو الخامس: التسويق الرقمي واتخاذ القرارات المبنية على البيانات

> **Source document:** `السيناريو الخامس التسويق الرقمي.docx`
>
> **Scenario ID:** S5
>
> **Sequential position:** 5 of 5 (final scenario in the journey)
>
> **Primary interaction mode:** A/B testing analytical simulation (محاكاة تحليلية تفاعلية)

---

## أولاً: البيانات العامة للسيناريو

| الحقل | القيمة |
|---|---|
| عنوان السيناريو | التسويق الرقمي: اختبار الأداء (A/B Testing) |
| المهارة المستهدفة | التسويق الرقمي واتخاذ القرارات المبنية على البيانات (Data-driven Decisions) |
| المجال | ريادة الأعمال الرقمية |
| نوع السيناريو | محاكاة تحليلية تفاعلية تعتمد على قراءة لوحات البيانات (Dashboards) |
| الفئة المستهدفة | طلاب تكنولوجيا التعليم |
| دور الطالب | مدير تسويق رقمي (Growth Hacker) |
| دور الوكيل الذكي | محلل بيانات (Data Analyst) وموجه تسويقي |
| الهدف العام | تدريب الطالب على تصميم حملات تسويقية (A/B Testing)، وقراءة رسوم لوحات البيانات لاستنتاج الحملة الأنجح، وتجنب الانخداع بالمقاييس السطحية لصالح المقاييس الاقتصادية الحقيقية (تكلفة العميل) |

---

## ثانياً: الموقف التعليمي العام (مرحلة التجريب والقياس)

### الافتتاحية (Researcher Canonical Opening)

**الوكيل الذكي:**

مشروعك يعمل الآن بكفاءة، ونجحنا في تخطي الأزمات التقنية. حان الوقت لجذب العملاء وتنمية المبيعات. لديك ميزانية تسويقية قدرها 1000 دولار، لكننا لن ننفقها دفعة واحدة.

في التسويق الرقمي، نعتمد أسلوب (A/B Testing)؛ حيث نطلق حملتين تجريبيتين بميزانية صغيرة (100 دولار لكل منهما) لنختبر أي رسالة ستجذب العملاء المستهدفين بشكل أفضل.

مهمتك الأولى: حدد عنوانين مختلفين لإعلانك لتجربتهما (مثال: أحدهما يركز على "السعر والخصم"، والآخر يركز على "جودة الخدمة وتوفير الوقت").

---

## رابعاً: مسار العقد والتفرعات (التحليل والاستنتاج)

### العقدة (N1): إعداد التجربة (A/B Test)

**Input:** Two advertising headline text inputs

يُدخل الطالب متغيرات الحملتين. بمجرد الإدخال، يقوم الوكيل بمحاكاة مرور 3 أيام ويعرض النتائج.

```
After input -> N2 (simulated 3-day passage)
```

---

### العقدة (N2): عرض لوحة البيانات (The Dashboard)

تظهر للطالب لوحة بيانات مصغرة (في التطبيق، يمكن عرضها كرسوم بيانية حقيقية Bar Charts).

**الوكيل:**

هذه نتائج الحملتين بعد إنفاق 100 دولار على كل منهما:

**الحملة (A) - التركيز على السعر:**
- عدد النقرات (الزيارات): 1000 زيارة
- العملاء الفعليون (الذين اشتروا): 5 عملاء

**الحملة (B) - التركيز على الجودة:**
- عدد النقرات (الزيارات): 200 زيارة فقط
- العملاء الفعليون (الذين اشتروا): 20 عميلاً

بناءً على هذه الأرقام، أي الحملتين ستوقفها، وأين ستضع باقي الميزانية؟ ولماذا؟

> **ملاحظة:** الحملة A تعتبر فخاً "Vanity Metrics"، حيث النقرات عالية لكن المبيعات منخفضة.

**Input for student decision:** Free text (which campaign to stop, where to allocate remaining budget, reasoning)

---

### العقدة (N3): تحليل الأرقام (الاستفزاز التحليلي)

---

#### المسار الأول (N3-B): التحليل العميق (إجابة متقدمة)

**الحالة:** إذا اختار الطالب الحملة (B) وبرر ذلك بكثرة المشترين الفعليين.

**الوكيل:**

قراءة ممتازة للبيانات! لم تنخدع بعدد الزيارات الوهمية في الحملة (A). في الحملة (B)، جذبت المهتمين حقاً ودفعوا المال. لقد حققت "تكلفة استحواذ على العميل" (CPA) منخفضة جداً مقارنة بـ (A).

**الانتقال:** N4

---

#### المسار الثاني (N3-A): التحليل السطحي (تدخل لتصحيح المسار)

**الحالة:** إذا اختار الطالب الحملة (A) مبرراً ذلك بأنها جذبت 1000 زيارة.

**الوكيل كمدقق:**

انتظر قليلاً. الحملة (A) جلبت زواراً كثر، لكن كم شخصاً اشترى فعلاً؟ 5 أشخاص فقط! هذا يعني أن تكلفة العميل الواحد كلفتك 20 دولاراً. بينما الحملة (B) جلبت 20 عميلاً بتكلفة 5 دولارات للعميل. النقرات لا تدفع الفواتير، المبيعات هي من تفعل ذلك.

هل تريد تغيير قرارك؟

> يمنحه فرصة للتعديل ثم ينتقل لـ N4.

**الانتقال:** N4

---

#### المسار الثالث (N3-C): العجز عن التحليل (تلميح - Fallback)

**الحالة:** إذا لم يستطع الطالب الربط بين الأرقام.

**تلميح الوكيل:**

اقسم ميزانية الحملة (100 دولار) على عدد (العملاء الفعليين) في كل حملة لمعرفة تكلفة العميل الواحد. الحملة الأرخص في تكلفة العميل هي الأنجح.. أعد الحساب.

**الانتقال:** N4

---

### العقدة (N4): التمكين الاقتصادي عبر الميزانية

**الوكيل:**

الآن وقد عرفنا أن الحملة (B) هي الرابحة، لديك 800 دولار متبقية. قرارك المبني على البيانات بتوجيهها للحملة (B) سيضمن لك استثماراً ذكياً يحقق أقصى عائد مالي (ROI) للمشروع. لقد مارست دور رائد الأعمال بذكاء تحليلي.

```
N4 -> END
```

---

## خامساً: النهاية والتغذية الراجعة (END)

**Researcher Canonical END:**

يعرض الوكيل تقريراً يركز على مهارة القراءة النقدية للبيانات:

تقرير الأداء التحليلي:

- قراءة البيانات: نجحت في قراءة المقاييس الحقيقية (المبيعات) وتجاهلت مقاييس الغرور (النقرات العشوائية).
- القرارات المدفوعة بالبيانات (Data-driven): استخدمت نتائج الـ A/B Testing لتقليل المخاطرة المالية وزيادة العائد.

نصيحة الوكيل: في الاقتصاد الرقمي، البيانات هي النفط الجديد. لا تتخذ قراراً تسويقياً بناءً على حدسك الشخصي، بل دع أرقام العملاء والسوق تتحدث، ثم اتبعها.

> **NOTE:** This END marks the completion of the ENTIRE five-scenario experiment journey. The overall experiment completion message should appear after S5 END.

---

## سادساً: مؤشرات الأداء للقياس (Analytics Dashboard)

| المؤشر المستهدف | ما يسجله الوكيل برمجياً (Log) |
|---|---|
| التمييز بين المقاييس | قدرة الطالب على تجاوز Vanity metrics (النقرات) لصالح Actionable metrics (المبيعات) |
| الوعي بحساب التكلفة (CPA) | هل استطاع الطالب استنتاج "تكلفة استحواذ العميل" ضمنياً أو صراحة في تبريره؟ |
| الاستجابة للتدخلات | قدرة الطالب على تغيير قراره المالي بعد توضيح الوكيل للفرق بين النقرات والمشتريات |
| التفكير الاقتصادي | توجيه الموارد المالية (باقي الميزانية) للمكان الذي يحقق أعلى عائد استثماري (ROI) |

---

## Special Mechanics for Implementation

1. **Two advertising headline inputs (N1):** Student provides two different ad headlines. This is structured input, not free-text evaluation.

2. **Simulated 3-day passage:** After N1 input, the system simulates passage of time and presents fixed/predetermined campaign results. This is NOT AI-generated data.

3. **Fixed campaign results (N2):** The data is ALWAYS:
   - Campaign A: 1000 clicks, 5 purchasers (CPA = $20)
   - Campaign B: 200 clicks, 20 purchasers (CPA = $5)
   These numbers are canonical researcher-authored data, not dynamically generated.

4. **Visual dashboard:** Prefer native HTML/CSS bars/cards for the campaign comparison. Do NOT add a chart library solely for this small fixed visualization.

5. **Vanity Metrics trap:** The pedagogical design intentionally makes Campaign A look "better" by superficial metrics (clicks). The learning moment is recognizing that Campaign B has superior actionable metrics (actual purchasers, lower CPA).

6. **Remaining budget decision:** $800 remaining (1000 - 100 - 100). The correct data-driven decision is to allocate to Campaign B.

7. **CPA/ROI learning focus:** The core analytical concept is Cost Per Acquisition and Return on Investment. The agent must explain these if the student doesn't recognize them.

8. **Scenario 5 diagram conflict (APPROVED RESOLUTION):** The written Scenario 5 content about digital marketing A/B testing is canonical. The embedded diagram/illustration that depicts cyberattack/crisis behavior is treated as an illustration mismatch in the source document. Do NOT use the crisis diagram to define Scenario 5 runtime behavior. Use the WRITTEN A/B Testing specification. This handling is explicitly approved by the project owner.