/**
 * Scenario Data for Digital Opportunity Discovery (Version 1.0)
 *
 * Source of Truth: SCENARIO_SPEC.md (Frozen for Pilot)
 * Note: Deterministic routing (getNextNode) is deliberately separated and belongs to T14.
 */

export const SCENARIO_VERSION = "1.0";
export const START_NODE_ID: NodeId = "N1";
export const COMPLETION_NODE_ID: NodeId = "END";

export const SCENARIO_OPENING_MESSAGE =
  "مرحبًا بك.\n\nتخيل أنك تريد إنشاء مشروع رقمي صغير يمكن أن يحقق لك استقلالًا ماليًا، ولكن لديك ميزانية محدودة، ولا تملك منتجًا محددًا حتى الآن.\n\nأمامك فرصة للبحث عن مشكلة حقيقية يعاني منها إحدى الفئات المستهدفة وتحويلها إلى فرصة مشروع رقمي يدر عائدًا.\n\nمن أين ستبدأ؟";

export type NodeId =
  | "N1"
  | "N1_H"
  | "N1_F"
  | "N2"
  | "N2_H"
  | "N3"
  | "N3_H"
  | "N4"
  | "N4_REV"
  | "N4_H"
  | "N5"
  | "N5_H"
  | "END";

export type InteractionMode =
  | "evaluated_text"
  | "choice"
  | "message_auto_continue"
  | "text_no_classification"
  | "completion";

export interface RubricDefinition {
  readonly advanced?: string;
  readonly medium?: string;
  readonly weak?: string;
  readonly advancedOrMedium?: string;
}

export interface FeedbackIntent {
  readonly advanced?: string;
  readonly medium?: string;
  readonly weak?: string;
}

export interface EvaluatedTextNode {
  readonly id: NodeId;
  readonly title: string;
  readonly interactionMode: "evaluated_text";
  readonly prompt: string;
  readonly learningGoal?: string;
  readonly rubric?: RubricDefinition;
  readonly feedbackIntent?: FeedbackIntent;
  readonly guidance?: string;
  readonly parentNodeId?: NodeId;
}

export interface ChoiceNode {
  readonly id: NodeId;
  readonly title: string;
  readonly interactionMode: "choice";
  readonly prompt: string;
  readonly choices: readonly [string, string];
}

export interface MessageAutoContinueNode {
  readonly id: NodeId;
  readonly title: string;
  readonly interactionMode: "message_auto_continue";
  readonly message: string;
}

export interface TextNoClassificationNode {
  readonly id: NodeId;
  readonly title: string;
  readonly interactionMode: "text_no_classification";
  readonly prompt: string;
  readonly learningGoal?: string;
  readonly guidance?: string;
}

export interface CompletionNode {
  readonly id: NodeId;
  readonly title: string;
  readonly interactionMode: "completion";
  readonly message: string;
}

export type ScenarioNode =
  | EvaluatedTextNode
  | ChoiceNode
  | MessageAutoContinueNode
  | TextNoClassificationNode
  | CompletionNode;

export const SCENARIO_NODES: Record<NodeId, ScenarioNode> = {
  N1: {
    id: "N1",
    title: "تحديد نقطة البداية",
    interactionMode: "evaluated_text",
    learningGoal:
      "أن يبدأ الطالب من احتياج أو مشكلة حقيقية لدى العملاء/السوق، لا من منتج يرغب في بيعه أولًا.",
    prompt:
      "لديك ميزانية محدودة ولا توجد لديك فكرة مشروع محددة حتى الآن. أمامك خياران:\n\nأ) البحث أولًا عن احتياجات ومشكلات العملاء.\nب) اختيار فكرة منتج تعجبك ثم محاولة إقناع الناس بشرائها.\n\nأي الخيارين تختار؟ ولماذا؟",
    rubric: {
      advanced:
        "الإجابة توضح بصورة مباشرة أن نقطة البداية هي البحث عن:\n- احتياج\n- مشكلة\n- سوق\n- جمهور\n- بحث\n- فئة مستهدفة\nمع تفسير منطقي يربط ذلك باكتشاف فرصة حقيقية.",
      medium:
        "الإجابة تختار الاتجاه المقبول أو تشير إلى البحث/السوق/العملاء، لكن التفسير محدود أو غير عميق.",
      weak:
        "الإجابة تبدأ من:\n- المنتج\n- فكرة يرغب الطالب في صنعها\n- تطبيق\n- البيع\nدون ربط ذلك بمشكلة أو احتياج حقيقي.",
    },
    feedbackIntent: {
      advanced:
        "عزز أن البحث عن مشكلة حقيقية يساعد على اكتشاف فرصة ذات قيمة فعلية، ثم انتقل لفهم العميل.",
      medium:
        "عزز الاتجاه ثم اطلب التفكير بصورة أعمق في الفرق بين البحث عن منتج نرغب في بيعه والبحث عن مشكلة يمكن حلها.",
      weak:
        "قدّم تلميحًا: قبل السؤال \"ماذا أريد أن أبيع؟\" فكر \"ما المشكلة التي يعاني منها الناس ويمكنني حلها؟\"",
    },
  },

  N1_H: {
    id: "N1_H",
    title: "إعادة المحاولة",
    interactionMode: "evaluated_text",
    prompt:
      "تخيل أنك لاحظت أن كثيرًا من طلاب الجامعة يجدون صعوبة في العثور على مصادر تعليمية موثوقة لمقرراتهم.\n\nهل يمكن أن تمثل هذه المشكلة نقطة بداية لاكتشاف فرصة رقمية؟ ولماذا؟",
    rubric: {
      advanced:
        "يتعرف بوضوح على أن وجود مشكلة حقيقية لدى فئة محددة يمكن أن يمثل نقطة بداية لفرصة رقمية، ويشرح السبب.",
      medium: "يوافق بصورة صحيحة ويقدم تفسيرًا بسيطًا.",
      weak:
        "لا يربط المشكلة باكتشاف فرصة أو يعود مرة أخرى للبدء بمنتج دون فهم المشكلة.",
    },
  },

  N1_F: {
    id: "N1_F",
    title: "مسار الإنقاذ المتكرر",
    interactionMode: "choice",
    prompt:
      "يبدو أن الأمر يحتاج إلى توضيح بسيط.\n\nالقاعدة الذهبية هنا هي: لا تبحث عن عملاء لمنتجك، بل ابحث عن منتج لعملائك.\n\nدعنا نتأكد من الفكرة عبر هذا السؤال السريع:\n\nإذا أردت البدء بمشروع ناجح، هل تبدأ بـ:\n\n1. تصميم تطبيق متطور ثم البحث عمن يشتريه.\n2. رصد مشكلة يواجهها الناس ثم تصميم تطبيق لحلها.\n\nاكتب الرقم الصحيح.",
    choices: [
      "تصميم تطبيق متطور ثم البحث عمن يشتريه.",
      "رصد مشكلة يواجهها الناس ثم تصميم تطبيق لحلها.",
    ],
  },

  N2: {
    id: "N2",
    title: "فهم العملاء والمشكلة",
    interactionMode: "evaluated_text",
    prompt:
      "اكتشفت مشكلة تتعلق بصعوبة وصول بعض طلاب الجامعة إلى مصادر تعليمية مناسبة. لكن ليس كل الطلاب لديهم نفس الاحتياجات.\n\nما أهم المعلومات التي تحتاج لمعرفتها عن العملاء المستهدفين قبل أن تقرر وجود فرصة حقيقية؟",
    rubric: {
      advanced:
        "يذكر عدة عناصر تحليلية مثل:\n- المنافسين\n- البدائل\n- القدرة الشرائية\n- السلوك\n- حجم الفئة/المشكلة\n- الحلول الحالية\nويظهر أنه لا يكتفي بمعرفة وجود المشكلة.",
      medium:
        "يركز على معرفة الاحتياجات أو خصائص العميل، لكن لا يحلل بصورة كافية كيف يحل العميل المشكلة حاليًا أو ما البدائل الموجودة.",
      weak:
        "إجابة عامة جدًا أو لا تتناول العميل والمشكلة بصورة تسمح بتقييم وجود فرصة.",
    },
    feedbackIntent: {
      advanced:
        "عزز أنه يبحث عن حجم المشكلة والبدائل الموجودة، ثم انتقل لاكتشاف الفجوة.",
      medium:
        "أكد أن معرفة الاحتياجات بداية جيدة، ثم وجّه انتباهه إلى كيفية حل العميل للمشكلة حاليًا.",
      weak:
        "وجّهه إلى ثلاثة أسئلة:\n- ما المشكلة؟\n- كيف يحلها العميل حاليًا؟\n- ما الشيء المفقود في الحلول الحالية؟",
    },
  },

  N2_H: {
    id: "N2_H",
    title: "تلميح القصور في الحلول الحالية",
    interactionMode: "message_auto_continue",
    message:
      "قبل أن تبحث عن حل جديد، ركز على ما يفعله الطلاب حاليًا: ما الحلول التي يستخدمونها؟ وما أوجه القصور أو الشيء المفقود فيها؟",
  },

  N3: {
    id: "N3",
    title: "اكتشاف الفجوة الرقمية",
    interactionMode: "evaluated_text",
    prompt:
      "اكتشفت أن بعض الطلاب يعتمدون على مجموعات التواصل الاجتماعي للبحث عن المصادر، لكنهم يواجهون مشكلات مثل صعوبة التحقق من الجودة وتشتت الروابط.\n\nهل ترى هنا فرصة رقمية؟ وما الفجوة التي يمكن لمشروعك استغلالها؟",
    rubric: {
      advanced:
        "يحدد فجوة واضحة في الحلول الحالية، مثل تنظيم/تجميع/التحقق من المصادر، ويربطها بمشكلة المستخدم.",
      medium:
        "يقدم فكرة ممكنة لكنها عامة ولا يحدد بوضوح:\n- لمن؟\n- ما المشكلة؟\n- ما القيمة؟",
      weak:
        "يركز على فكرة \"مبتكرة\" دون تحديد النقص في الحلول الحالية أو ما يفتقده الطالب.",
    },
    feedbackIntent: {
      advanced: "أكد أنه حدد فجوة واضحة واطلب تحويلها إلى فرصة مشروع.",
      medium: "اطلب منه تحديد: لمن؟ ما المشكلة؟ ما القيمة؟",
      weak:
        "ذكّره أن المطلوب ليس مجرد فكرة مبتكرة بل نقص في الحلول الحالية، ثم أعده لمسار تحليل الحلول الحالية.",
    },
  },

  N3_H: {
    id: "N3_H",
    title: "تحسين تحديد الفجوة",
    interactionMode: "evaluated_text",
    prompt:
      "فكرتك ممكنة، لكنها ما زالت عامة.\n\nأعد صياغة الفجوة في إجابة قصيرة توضح:\n\n- لمن هذه الفرصة؟\n- ما المشكلة المحددة؟\n- ما القيمة التي يمكن أن يقدمها الحل؟",
    rubric: {
      advancedOrMedium:
        "يحدد الفئة + المشكلة + قيمة واضحة بما يكفي للانتقال لصياغة الفرصة.",
      weak: "يظل عامًا ولا يحدد الفجوة.",
    },
  },

  N4: {
    id: "N4",
    title: "صياغة الفرصة الرقمية والقيمة الاقتصادية",
    interactionMode: "evaluated_text",
    prompt:
      "اقترح فرصة رقمية محددة لحل هذه المشكلة، واشرح في جملة ما القيمة التي سيحصل عليها العميل منها.",
    guidance:
      "صياغة الفرصة والقيمة المقدمة للعميل (opportunity + value). الفكرة تحتاج إلى توضيح: المستخدم، المشكلة، الحل، القيمة.",
  },

  N4_REV: {
    id: "N4_REV",
    title: "الاستدامة المالية وتوليد العائد",
    interactionMode: "evaluated_text",
    parentNodeId: "N4",
    prompt:
      "فكرتك تعالج مشكلة الوصول والتنظيم. لكن رائد الأعمال يبحث أيضًا عن الاستدامة المالية والتمكين الاقتصادي.\n\nكيف يمكن لهذه الفرصة أن تولد عائدًا ماديًا لك؟ ولماذا تعتقد أنها تستحق التطوير؟",
    rubric: {
      advanced:
        "يقترح آلية دخل واضحة ومناسبة للفكرة ويبرر جدوى التطوير.",
      medium:
        "يذكر آلية دخل أو تبريرًا معقولًا لكن بصورة غير مكتملة.",
      weak: "لا يقدم تصورًا واقعيًا للدخل أو لا يربط العائد بالفرصة.",
    },
  },

  N4_H: {
    id: "N4_H",
    title: "تحسين صياغة الفرصة",
    interactionMode: "text_no_classification",
    prompt:
      "لضمان وضوح فكرتك، نستخدم نموذجًا مبسطًا من \"مخطط القيمة المقدمة\".\n\nاستخدم العناصر التالية لصياغة فرصتك مرة أخرى:\n\n- الفئة المستهدفة: من هم؟\n- المشكلة: ما الذي يعانون منه؟\n- الحل الرقمي: ما هو مشروعك؟\n- القيمة المقدمة: ما الفائدة المباشرة التي سيحصلون عليها؟",
    guidance:
      "تدخل تعليمي داعم (Scaffolding). يتم حفظ الإجابة ولا تتطلب تصنيفًا للتوجيه.",
  },

  N5: {
    id: "N5",
    title: "تبرير اختيار الفرصة",
    interactionMode: "evaluated_text",
    prompt:
      "أمامك الآن مشروعك المقترح.\n\nما الأسباب التي تجعلك تختار هذه الفرصة تحديدًا؟ اذكر عاملين على الأقل، منها ما يخص العملاء ومنها ما يخص العائد.",
    rubric: {
      advanced:
        "يبرر الاختيار من خلال عناصر مثل:\n\n- مشكلة/احتياج حقيقي\n- فئة مستهدفة واضحة\n- قيمة\n- عائد مادي أو نموذج دخل\n\nويظهر ربطًا بين احتياج العميل والقيمة الاقتصادية.",
      medium:
        "التبرير جيد جزئيًا، لكنه يحتاج توضيح أن الاختيار لا يقوم فقط على إعجاب الطالب بالفكرة بل على حل مشكلة وقابلية التحول إلى قيمة اقتصادية.",
      weak:
        "تبرير ضعيف أو ذاتي لا يعتمد على العميل والجدوى الاقتصادية.",
    },
    feedbackIntent: {
      advanced:
        "عزز أنه ربط الفكرة باحتياج حقيقي وبطريقة لتحقيق الدخل، ثم أنهِ السيناريو.",
      medium:
        "اسأله: هل اخترت الفرصة لأنها تعجبك أم لأنها تحل مشكلة ويمكن أن تتحول إلى قيمة اقتصادية؟",
      weak: "وجهه لإعادة تحسين صياغة الفرصة وجدواها عبر N4_H.",
    },
  },

  N5_H: {
    id: "N5_H",
    title: "تحسين تبرير القرار",
    interactionMode: "evaluated_text",
    prompt:
      "تبريرك جيد، لكن فكر مرة أخرى:\n\nهل اخترت الفرصة لأنها تعجبك فقط، أم لأنها تحل مشكلة حقيقية ويمكن أن تتحول إلى قيمة اقتصادية؟\n\nوضّح السبب.",
    rubric: {
      advancedOrMedium:
        "يربط الاختيار بالمشكلة/العميل + إمكانية القيمة الاقتصادية.",
      weak: "يظل التبرير ذاتيًا أو غير مرتبط بالمشكلة والجدوى.",
    },
  },

  END: {
    id: "END",
    title: "النهاية",
    interactionMode: "completion",
    message:
      "أحسنت! لقد أكملت سيناريو اكتشاف الفرص الرقمية.\n\nخلال السيناريو تدربت على:\n\n- تحديد المشكلة والاحتياج بدلًا من البدء بالمنتج.\n- تحليل الفجوة في الحلول الحالية.\n- صياغة حل رقمي يقدم قيمة فعلية.\n- التفكير في آلية لتحقيق عائد مادي واستدامة اقتصادية.",
  },
} satisfies Record<NodeId, ScenarioNode>;
