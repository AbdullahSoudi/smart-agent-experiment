import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SCENARIO_DISPLAY_NAMES } from "../lib/journey";

test("T-ONBOARD-1: Login Screen 1 Contract (Registration Only)", () => {
  const homePath = path.resolve(process.cwd(), "app/page.tsx");
  const content = fs.readFileSync(homePath, "utf8");

  // Step 1 Heading
  assert.ok(content.includes("بيانات المشارك"), "Screen 1 must render 'بيانات المشارك' heading");

  // Field 1: Name
  assert.ok(content.includes("الاسم"), "Screen 1 must include label 'الاسم'");
  assert.ok(content.includes("أدخل اسمك الثلاثي"), "Screen 1 must include placeholder 'أدخل اسمك الثلاثي'");

  // Field 2: Code
  assert.ok(content.includes("كود المشارك"), "Screen 1 must include label 'كود المشارك'");
  assert.ok(content.includes("أدخل كود المشارك المعتمد"), "Screen 1 must include placeholder 'أدخل كود المشارك المعتمد'");

  // Action Button
  assert.ok(content.includes("التالي"), "Screen 1 must have button 'التالي'");

  // Conditional Rendering Invariant: Screen 1 does not display scenario cards or intro hero
  assert.ok(
    content.includes('step === "login"') && content.includes('setStep("intro")'),
    "Component must enforce separate step rendering for 'login' and 'intro'"
  );
});

test("T-ONBOARD-2: Introduction Screen 2 Contract (Intro, 5 Scenarios & CTA)", () => {
  const homePath = path.resolve(process.cwd(), "app/page.tsx");
  const content = fs.readFileSync(homePath, "utf8");

  // Application Heading / Masthead
  assert.ok(content.includes("ريادة الأعمال الرقمية"), "Screen 2 must include application heading 'ريادة الأعمال الرقمية'");

  // Introductory Hero
  assert.ok(content.includes("ابدأ رحلتك الريادية"), "Screen 2 must include hero title 'ابدأ رحلتك الريادية'");
  assert.ok(
    content.includes("أدخل اسمك وكود المشارك المخصص لك للمتابعة عبر سيناريوهات التجربة الخمسة المتتالية لتطوير مهارات ريادة الأعمال الرقمية."),
    "Screen 2 must include canonical explanatory paragraph"
  );

  // Five Scenario Cards with Canonical Titles
  assert.equal(SCENARIO_DISPLAY_NAMES[1], "اكتشاف الفرص الرقمية");
  assert.equal(SCENARIO_DISPLAY_NAMES[2], "توليد الأفكار الابتكارية");
  assert.equal(SCENARIO_DISPLAY_NAMES[3], "تخطيط نموذج العمل التجاري");
  assert.equal(SCENARIO_DISPLAY_NAMES[4], "اتخاذ القرار وإدارة المخاطر");
  assert.equal(SCENARIO_DISPLAY_NAMES[5], "التسويق الرقمي");

  assert.ok(content.includes("STAGES_PREVIEW"), "Screen 2 must render STAGES_PREVIEW");

  // Research Notice
  assert.ok(
    content.includes("تأكد من إدخال نفس الكود المعتمد لك في الدراسة. إذا كنت قد بدأت جلسة سابقة، فسيتم استئناف رحلتك التعليمية تلقائيًا من حيث توقفت."),
    "Screen 2 must include canonical research notice"
  );

  // Main CTA & Back navigation
  assert.ok(content.includes("ابدأ التجربة"), "Screen 2 must have prominent CTA 'ابدأ التجربة'");
  assert.ok(content.includes("رجوع"), "Screen 2 must provide subtle back button 'رجوع'");
});

test("T-ONBOARD-3: Participant Identity & Session Semantics Contract", () => {
  const homePath = path.resolve(process.cwd(), "app/page.tsx");
  const content = fs.readFileSync(homePath, "utf8");

  // Next button does NOT trigger /api/session/start
  const handleNextSection = content.slice(
    content.indexOf("const handleNext"),
    content.indexOf("const handleBack")
  );
  assert.ok(
    !handleNextSection.includes("/api/session/start"),
    "handleNext must NOT call /api/session/start (no premature session creation)"
  );
  assert.ok(
    handleNextSection.includes('setStep("intro")'),
    "handleNext transitions step to 'intro'"
  );

  // Start experiment invokes /api/session/start
  const handleStartSection = content.slice(content.indexOf("const handleStartExperiment"));
  assert.ok(
    handleStartSection.includes("/api/session/start"),
    "handleStartExperiment must call /api/session/start"
  );

  // Session storage key invariant
  assert.ok(
    content.includes('sessionStorage.setItem("experiment_session_id"'),
    "Must store session using canonical key 'experiment_session_id'"
  );
  assert.ok(
    !content.includes('localStorage.setItem("experiment_session_id"'),
    "Must NEVER replace sessionStorage with localStorage for session ID"
  );

  // Double click protection
  assert.ok(
    handleStartSection.includes("if (isSubmitting) return"),
    "Must guard handleStartExperiment against duplicate clicks"
  );
});

test("T-ONBOARD-4: Researcher & Supervisor Attribution Contract", () => {
  const footerPath = path.resolve(process.cwd(), "components/ResearchCreditsFooter.tsx");
  assert.ok(fs.existsSync(footerPath), "ResearchCreditsFooter.tsx must exist");
  const footerContent = fs.readFileSync(footerPath, "utf8");

  // Exact names verbatim
  assert.ok(
    footerContent.includes("الباحث: بسام امام سعيد مراد"),
    "Must contain exact researcher name: 'الباحث: بسام امام سعيد مراد'"
  );
  assert.ok(
    footerContent.includes("إشراف: أ.د / ايمان زكي موسى الشريف"),
    "Must contain exact supervisor name: 'إشراف: أ.د / ايمان زكي موسى الشريف'"
  );

  // No WhatsApp link in footer
  assert.ok(!footerContent.includes("wa.me"), "Footer must not contain WhatsApp link");
  assert.ok(!footerContent.includes("واتساب"), "Footer must not contain WhatsApp text");

  // No personal copyright
  assert.ok(!footerContent.includes("Abdullah Mustafa"), "Footer must not contain previous owner name");
  assert.ok(!footerContent.includes("جميع الحقوق محفوظة"), "Academic credits must not contain copyright claims");
});

test("T-ONBOARD-5: Old Owner Personal Branding & WhatsApp Completely Removed", () => {
  const obsoleteFooterPath = path.resolve(process.cwd(), "components/CopyrightFooter.tsx");
  assert.ok(!fs.existsSync(obsoleteFooterPath), "Obsolete CopyrightFooter.tsx must be removed");

  // Search entire codebase for WhatsApp link or owner phone number
  const checkFiles = [
    "app/page.tsx",
    "app/complete/page.tsx",
    "app/layout.tsx",
    "app/globals.css",
  ];

  for (const relPath of checkFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    const content = fs.readFileSync(fullPath, "utf8");
    assert.ok(!content.includes("201032398617"), `File ${relPath} must not contain WhatsApp phone number`);
    assert.ok(!content.includes("wa.me"), `File ${relPath} must not contain wa.me link`);
    assert.ok(!content.includes("Abdullah Mustafa"), `File ${relPath} must not contain old owner name`);
    assert.ok(!content.includes("CopyrightFooter"), `File ${relPath} must not import CopyrightFooter`);
  }
});

test("T-ONBOARD-6: Application Title Updated Universally across Public Pages", () => {
  const layoutPath = path.resolve(process.cwd(), "app/layout.tsx");
  const layoutContent = fs.readFileSync(layoutPath, "utf8");
  assert.ok(
    layoutContent.includes('title: "ريادة الأعمال الرقمية"'),
    "Root layout metadata title must be 'ريادة الأعمال الرقمية'"
  );

  const homePath = path.resolve(process.cwd(), "app/page.tsx");
  const homeContent = fs.readFileSync(homePath, "utf8");
  assert.ok(
    homeContent.includes("ريادة الأعمال الرقمية"),
    "Home page must display 'ريادة الأعمال الرقمية'"
  );
  assert.ok(
    !homeContent.includes("المرشد الريادي الذكي"),
    "Home page must NOT contain old title 'المرشد الريادي الذكي'"
  );

  const completePath = path.resolve(process.cwd(), "app/complete/page.tsx");
  const completeContent = fs.readFileSync(completePath, "utf8");
  assert.ok(
    completeContent.includes("ريادة الأعمال الرقمية"),
    "Complete page masthead badge must display 'ريادة الأعمال الرقمية'"
  );
  assert.ok(
    !completeContent.includes("المرشد الريادي الذكي"),
    "Complete page must NOT contain old title 'المرشد الريادي الذكي'"
  );
});
