/**
 * Scenario Data Model & Frozen Content
 *
 * Source of Truth: SCENARIO_SPEC.md & PILOT_ISSUES.md
 * Versions:
 *   - 1.0: Frozen historical baseline
 *   - 1.1: Simplified student-friendly instructional Arabic wording (approved in T54)
 *
 * Rubrics, educational objectives, and deterministic transition topology
 * are 100% identical between versions.
 */

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

export type EvaluatedNodeId =
  | "N1"
  | "N1_H"
  | "N2"
  | "N3"
  | "N3_H"
  | "N4"
  | "N4_REV"
  | "N5"
  | "N5_H";

export type InteractionMode =
  | "evaluated_text"
  | "quick_reply_rescue"
  | "message_auto_continue"
  | "text_no_classification"
  | "completion";

export interface RubricCriteria {
  advanced?: string;
  medium?: string;
  weak?: string;
  advancedOrMedium?: string;
}

export interface FeedbackIntent {
  advanced?: string;
  medium?: string;
  weak?: string;
}

export interface ScenarioNode {
  id: NodeId;
  title: string;
  interactionMode: InteractionMode;
  prompt?: string;
  message?: string;
  choices?: readonly string[];
  rubric?: RubricCriteria;
  feedbackIntent?: FeedbackIntent;
  guidance?: string;
  parentNodeId?: NodeId;
}

export const START_NODE_ID: NodeId = "N1";
export const TERMINAL_NODE_ID: NodeId = "END";
export const DEFAULT_SCENARIO_VERSION = "1.1";
export const SCENARIO_VERSION = "1.1";

/**
 * Historical Scenario v1.0 nodes (preserved for research reproducibility).
 */
export const SCENARIO_NODES_V1_0: Record<NodeId, ScenarioNode> = {
  N1: {
    id: "N1",
    title: "اكتشاف المشكلة والاحتياج",
    interactionMode: "evaluated_text",
    prompt:
      "أنت طالب جامعي تلاحظ أن زملاءك يواجهون صعوبة في الوصول إلى ملخصات دراسية موثوقة ومراجعات قبل الاختبارات.\n\nتحدث مع زملائك لتفهم المشكلة بشكل أعمق.\n\nما أول خطوة ستبدأ بها لاكتشاف الفرصة؟",
    rubric: {
      advanced:
        "يركز مباشرة على التحدث مع الطلاب أو مراقبة سلوكهم أو جمع بيانات عن المشكلة لفهمها قبل اقتراح حل.",
      medium:
        "يذكر جمع المعلومات لكنه يخلطها فورًا بالتفكير في الحل، أو يكتفي بسؤال سطحي دون فهم عميق للمشكلة.",
      weak:
        "يقفز مباشرة إلى بناء الحل أو التطبيق دون التحقق من وجود المشكلة أو التحدث مع الطلاب.",
    },
    feedbackIntent: {
      advanced:
        "أكد صحة منهجيته في البدء من احتياج المستخدم واطلب منه تحديد الفجوة في الحلول الحالية.",
      medium:
        "اطلب منه التركيز أولاً على المشكلة وسلوك الطلاب قبل التفكير في مواصفات الحل.",
      weak:
        "نبهه إلى أن البداية الصحيحة هي التحقق من المشكلة وليس بناء الحل، ثم انقله إلى N1_H.",
    },
  },

  N1_H: {
    id: "N1_H",
    title: "إعادة توجيه لاكتشاف المشكلة",
    interactionMode: "evaluated_text",
    prompt:
      "قبل أن تبدأ بإنشاء موقع أو منصة، ركز على الخطوة الأولى:\n\nكيف تتأكد أن المشكلة حقيقية وتستحق حلاً؟\n\nأعد صياغة خطوتك الأولى بناءً على فهم احتياج الطلاب أولاً.",
    rubric: {
      advanced:
        "يقترح خطوة واضحة تركز على بحث الاحتياج، مثل إجراء مقابلات سريعة، استبيان، أو مراقبة طرق مذاكرتهم الحالية.",
      medium:
        "يذكر فكرة عامة عن البحث، لكنها غير محددة أو ما زالت متأثرة بالرغبة في إطلاق الحل.",
      weak:
        "يكرر الإصرار على بناء الحل أولاً أو يتجاهل دراسة احتياج الطلاب.",
    },
    feedbackIntent: {
      advanced: "عزز تركيزه على دراسة الاحتياج وانقله لمرحلة تحليل الحلول الحالية.",
      medium: "ساعده على تحويل الخطوة إلى إجراء عملي أكثر تحديدًا للتحقق من المشكلة.",
      weak: "انقله إلى خيارات محددة مسبقًا للاختيار بينها عبر N1_F.",
    },
  },

  N1_F: {
    id: "N1_F",
    title: "اختيار مبسط للخطوة الأولى",
    interactionMode: "quick_reply_rescue",
    prompt:
      "لمساعدتك في تجاوز هذه الخطوة، اختر الإجراء الأنسب للبدء من بين الخيارات التالية:\n\n1. عمل استبيان أو مقابلات سريعة مع 10 من زملائك لفهم كيفية حصولهم على الملخصات حاليًا ومشاكلها.\n2. البدء فورًا في تصميم تطبيق ومحاولة إقناع الطلاب باستخدامه لاحقًا.",
    choices: [
      "عمل استبيان أو مقابلات سريعة مع 10 من زملائك لفهم كيفية حصولهم على الملخصات حاليًا ومشاكلها.",
      "البدء فورًا في تصميم تطبيق ومحاولة إقناع الطلاب باستخدامه لاحقًا.",
    ],
  },

  N2: {
    id: "N2",
    title: "فهم احتياجات المستخدم والحلول الحالية",
    interactionMode: "evaluated_text",
    prompt:
      "بداية موفقة. ركزت على الاستماع للمستخدم أولاً.\n\nالآن، بعد أن تحدثت مع الطلاب وتأكدت من وجود المشكلة:\n\nما الذي يجب أن تركز عليه في الخطوة التالية لتحديد الفجوة في الحلول الحالية؟",
    rubric: {
      advanced:
        "يركز على تحليل ما يفعله الطلاب حاليًا (بدائل، جروبات تليجرام/واتساب، تصوير مكتبات...) ونقاط القصور في تلك الحلول.",
      medium:
        "يركز فقط على احتياجات الطلاب العامة دون الالتفات إلى كيف يحلون المشكلة حاليًا، أو يقترح فكرة حل دون مقارنتها بالبدائل.",
      weak:
        "يتجاهل الحلول الحالية والاحتياجات، ويكتفي باقتراح فكرة عشوائية أو يكرر ما قاله سابقًا.",
    },
    feedbackIntent: {
      advanced: "شجعه على الاستمرار في تحليل الفجوة، وانقله إلى صياغة الفجوة الرقمية.",
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
};

/**
 * Scenario v1.1 nodes: Simplified, natural, accessible Arabic for students.
 * Approved in T54. Retains identical rubrics and learning outcomes.
 */
export const SCENARIO_NODES_V1_1: Record<NodeId, ScenarioNode> = {
  N1: {
    id: "N1",
    title: "فهم المشكلة والاحتياج",
    interactionMode: "evaluated_text",
    prompt:
      "تخيل إنك طالب في الجامعة وبتلاحظ إن زمايلك بيعانوا عشان يلاقوا ملخصات ومراجعات موثوقة قبل الامتحانات.\n\nعايزين نبدأ نفهم الموضوع أكتر عشان نعمل مشروع مفيد.\n\nإيه أول خطوة هتفكر تبدأ بيها عشان تفهم المشكلة وتكتشف الفرصة؟",
    rubric: SCENARIO_NODES_V1_0.N1.rubric,
    feedbackIntent: SCENARIO_NODES_V1_0.N1.feedbackIntent,
  },

  N1_H: {
    id: "N1_H",
    title: "التأكد من احتياج الطلاب",
    interactionMode: "evaluated_text",
    prompt:
      "قبل ما تبدأ تبني موقع أو تطبيق، محتاجين نتأكد الأول إن المشكلة دي موجودة بجد عند الطلاب.\n\nإزاي هتتأكد إن دي مشكلة حقيقية وتستاهل نعملها حل؟ قول خطوتك الأولى ببساطة.",
    rubric: SCENARIO_NODES_V1_0.N1_H.rubric,
    feedbackIntent: SCENARIO_NODES_V1_0.N1_H.feedbackIntent,
  },

  N1_F: {
    id: "N1_F",
    title: "اختيار الخطوة الأولى المناسبة",
    interactionMode: "quick_reply_rescue",
    prompt:
      "عشان نساعدك تكمل، اختار أنسب طريقة تبدأ بيها من الخيارات دي:",
    choices: [
      "أسأل 10 من زمايلي وأفهم منهم إزاي بيجيبوا ملخصاتهم دلوقتي وإيه اللي مضايقهم فيها.",
      "أبدأ فورًا في برمجة تطبيق للملخصات وأحاول أقنع الطلاب يستخدموه بعد ما يخلص.",
    ],
  },

  N2: {
    id: "N2",
    title: "الحلول الحالية ونقاط القصور",
    interactionMode: "evaluated_text",
    prompt:
      "تمام، ممتاز إنك بدأت بفهم احتياج زمايلك.\n\nدلوقتي بعد ما اتكلمت معاهم وعرفت مشكلتهم:\n\nإيه الحاجة اللي المفروض تركز عليها عشان تعرف إيه اللي ناقص في الطرق اللي بيستخدموها حاليًا؟",
    rubric: SCENARIO_NODES_V1_0.N2.rubric,
    feedbackIntent: SCENARIO_NODES_V1_0.N2.feedbackIntent,
  },

  N2_H: {
    id: "N2_H",
    title: "تلميح للحلول الحالية",
    interactionMode: "message_auto_continue",
    message:
      "قبل ما تفكر في حل جديد، بص على اللي الطلاب بيعملوه دلوقتي: هما بيتصرفوا إزاي حاليًا؟ وإيه الحاجة الناقصة أو اللي مضايقاهم في طريقتهم دي؟",
  },

  N3: {
    id: "N3",
    title: "اكتشاف الحاجة الناقصة في السوق",
    interactionMode: "evaluated_text",
    prompt:
      "عرفت إن بعض الطلاب بيعتمدوا على جروبات تليجرام وفيسبوك عشان يلاقوا مذكرات ومصادر، بس بتواجههم مشاكل زي الروابط المشتتة والمصادر غير الموثوقة.\n\nشايف هنا فرصة لمشروع رقمي؟ وإيه الحاجة الناقصة دلوقتي ومشروعك ممكن يحلها؟",
    rubric: SCENARIO_NODES_V1_0.N3.rubric,
    feedbackIntent: SCENARIO_NODES_V1_0.N3.feedbackIntent,
  },

  N3_H: {
    id: "N3_H",
    title: "توضيح الفكرة والفايدة",
    interactionMode: "evaluated_text",
    prompt:
      "الفكرة كويسة، بس لسه عامة شوية.\n\nوضح فكرتك في جملة بسيطة تقول فيها:\n- مين بالظبط اللي بتساعدهم؟\n- إيه المشكلة المحددة؟\n- إيه الفايدة اللي مشروعك هيقدمهالهم؟",
    rubric: SCENARIO_NODES_V1_0.N3_H.rubric,
  },

  N4: {
    id: "N4",
    title: "صياغة فكرة المشروع والفايدة للعميل",
    interactionMode: "evaluated_text",
    prompt:
      "اقترح فكرة مشروع رقمي محدد يحل المشكلة دي، وقول في جملة واحدة: إيه الفايدة اللي الطالب هياخدها من فكرتك؟",
    guidance: SCENARIO_NODES_V1_0.N4.guidance,
  },

  N4_REV: {
    id: "N4_REV",
    title: "الاستمرار وتحقيق الدخل",
    interactionMode: "evaluated_text",
    parentNodeId: "N4",
    prompt:
      "فكرتك ممتازة في حل مشكلة تنظيم الملخصات. بس أي مشروع محتاج يستمر ويغطي مصاريفه.\n\nإزاي الفكرة دي ممكن تكسب منها فلوس أو تستمر كمشروع؟ وليه شايفها تستاهل التعب والتطوير؟",
    rubric: SCENARIO_NODES_V1_0.N4_REV.rubric,
  },

  N4_H: {
    id: "N4_H",
    title: "توضيح فكرتك خطوة بخطوة",
    interactionMode: "text_no_classification",
    prompt:
      "عشان فكرتك تبقى واضحة وسهلة، جاوب على النقط دي ببساطة:\n\n- مين الناس اللي بتستهدفهم؟\n- إيه المشكلة اللي بتواجههم؟\n- إيه الحل الرقمي اللي بتقدمه؟\n- إيه الفايدة المباشرة اللي هياخدوها منك؟",
    guidance: SCENARIO_NODES_V1_0.N4_H.guidance,
  },

  N5: {
    id: "N5",
    title: "أسباب اختيارك للمشروع",
    interactionMode: "evaluated_text",
    prompt:
      "دلوقتي قدامك فكرة مشروعك.\n\nليه اخترت الفرصة دي بالذات؟ اذكر سببين على الأقل: سبب يخص الطلاب واستفادتهم، وسبب يخص استمرار المشروع وتحقيق الدخل.",
    rubric: SCENARIO_NODES_V1_0.N5.rubric,
    feedbackIntent: SCENARIO_NODES_V1_0.N5.feedbackIntent,
  },

  N5_H: {
    id: "N5_H",
    title: "التفكير في جدوى الاختيار",
    interactionMode: "evaluated_text",
    prompt:
      "كلامك كويس، بس فكر معايا:\n\nهل اخترت الفرصة دي عشان عاجباك بس، ولا عشان فعلاً بتحل مشكلة حقيقية وممكن تكسب منها وتستمر؟\n\nوضح السبب ببساطة.",
    rubric: SCENARIO_NODES_V1_0.N5_H.rubric,
  },

  END: {
    id: "END",
    title: "النهاية",
    interactionMode: "completion",
    message:
      "أحسنت! كملت التجربة بنجاح.\n\nخلال الخطوات دي اتعلمت:\n- تبدأ بفهم المشكلة واحتياج الناس الأول قبل ما تبني أي حل.\n- تشوف إيه اللي ناقص في الطرق والحلول الموجودة حاليًا.\n- تقدم فكرة حل رقمي يقدم فايدة حقيقية.\n- تفكر إزاي المشروع يحقق دخل ويستمر بنجاح.",
  },
};

/**
 * Returns scenario nodes dictionary according to the requested scenario version.
 */
export function getScenarioNodes(version: string = "1.1"): Record<NodeId, ScenarioNode> {
  if (version === "1.0") {
    return SCENARIO_NODES_V1_0;
  }
  return SCENARIO_NODES_V1_1;
}

/**
 * Returns a specific node from the scenario with version awareness.
 */
export function getScenarioNode(nodeId: NodeId, version: string = "1.1"): ScenarioNode {
  const nodes = getScenarioNodes(version);
  const node = nodes[nodeId];
  if (!node) {
    throw new Error(`Node not found in scenario: ${nodeId} (version ${version})`);
  }
  return node;
}

/**
 * Default active scenario nodes (v1.1 for all current/new sessions).
 */
export const SCENARIO_NODES: Record<NodeId, ScenarioNode> = SCENARIO_NODES_V1_1;
