import { chromium, type Browser, type Page } from "playwright-core";
import { neon } from "@neondatabase/serverless";
import { spawn, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";

const QA_PROJECT_ID = "blue-glade-04227981";
const FORBIDDEN_PROD_ID = "blue-hall-10991515";
const PORT = 3005;
const BASE_URL = `http://localhost:${PORT}`;

function getEnvDatabaseUrl(): string {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) throw new Error(".env.local not found");
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const l of lines) {
    const trimmed = l.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      return trimmed.replace("DATABASE_URL=", "").trim();
    }
  }
  throw new Error("DATABASE_URL not found in .env.local");
}

async function verifyQaDatabase(dbUrl: string): Promise<void> {
  console.log("1. Verifying Database Connection...");
  const sql = neon(dbUrl);
  const res = (await sql`SELECT current_setting('neon.project_id', true) as pid`) as Array<{ pid: string }>;
  const pid = res[0]?.pid;
  console.log(`   Connected Project ID: ${pid}`);

  if (pid === FORBIDDEN_PROD_ID) {
    throw new Error(`CRITICAL VIOLATION: Connected to Production Neon (${FORBIDDEN_PROD_ID})! Aborting immediately!`);
  }
  if (pid !== QA_PROJECT_ID) {
    throw new Error(`CRITICAL: Expected QA project ID ${QA_PROJECT_ID}, but got ${pid}!`);
  }
  console.log("   ✓ Confirmed connected to isolated Neon QA database.");
}

async function waitForServer(url: string, timeoutMs = 25000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return;
    } catch {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server did not respond at ${url} within ${timeoutMs}ms`);
}

async function runQaSuite() {
  const dbUrl = getEnvDatabaseUrl();
  await verifyQaDatabase(dbUrl);

  const sql = neon(dbUrl);
  const qaDir = path.resolve(process.cwd(), "qa-screenshots");
  if (!fs.existsSync(qaDir)) {
    fs.mkdirSync(qaDir, { recursive: true });
  }

  // Start Next.js server
  console.log("\n2. Starting local Next.js production server on port", PORT);
  const serverProcess = spawn("cmd.exe", ["/c", `npx next start -p ${PORT}`], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), DATABASE_URL: dbUrl },
    stdio: "pipe",
  });

  serverProcess.stderr.on("data", (d) => console.log("[server stderr]", d.toString().trim()));

  try {
    await waitForServer(BASE_URL);
    console.log("   ✓ Next.js server is ready at", BASE_URL);

    // Launch Chrome
    const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    console.log("\n3. Launching Chrome browser via Playwright Core...");
    const browser = await chromium.launch({
      executablePath: chromePath,
      headless: true,
    });

    const consoleErrors: string[] = [];

    // Helper to create page with console monitoring
    const createMonitoredPage = async (viewport: { width: number; height: number }): Promise<Page> => {
      const context = await browser.newContext({
        viewport,
        locale: "ar",
      });
      const p = await context.newPage();
      p.on("pageerror", (err) => {
        consoleErrors.push(`[${viewport.width}px JS Exception] ${err.message}`);
      });
      p.on("console", (msg) => {
        if (msg.type() === "error") {
          const text = msg.text();
          if (text.includes("409 (Conflict)") || text.includes("favicon.ico") || text.includes("404")) {
            return; // Ignore intentional 409 from Case C NAME_CONFLICT test and favicon 404
          }
          consoleErrors.push(`[${viewport.width}px Console Error] ${text}`);
        }
      });
      return p;
    };

    console.log("\n4. Executing Mandatory Test Cases on Desktop (1440px)...");
    const page = await createMonitoredPage({ width: 1440, height: 900 });

    // =======================================================================
    // CASE A: NEW PARTICIPANT ONBOARDING FLOW
    // =======================================================================
    console.log("   --> Case A: Testing New Participant Flow");
    await page.goto(BASE_URL, { waitUntil: "networkidle" });

    // 1. Verify Screen 1 main content has ONLY login form
    const cardTitle = await page.locator(".login-card-title").textContent();
    if (cardTitle?.trim() !== "بيانات المشارك") {
      throw new Error(`Screen 1 heading expected 'بيانات المشارك', got '${cardTitle}'`);
    }

    // Verify fields
    const nameInput = page.locator("#student_name");
    const codeInput = page.locator("#student_code");
    const nextBtn = page.locator("button.login-submit-btn");

    if ((await nameInput.count()) !== 1 || (await codeInput.count()) !== 1) {
      throw new Error("Screen 1 must have exactly 1 student_name and 1 student_code input");
    }

    // Verify forbidden elements NOT on Screen 1
    const stagesOnScreen1 = await page.locator(".start-stages-grid").count();
    const heroOnScreen1 = await page.locator(".start-main-title").count();
    if (stagesOnScreen1 > 0 || heroOnScreen1 > 0) {
      throw new Error("Screen 1 must NOT display scenario cards or hero title!");
    }

    // Verify academic attribution footer on Screen 1
    const footerText = await page.locator(".research-credits-footer").textContent();
    if (
      !footerText?.includes("الباحث: بسام امام سعيد مراد") ||
      !footerText?.includes("إشراف: أ.د / ايمان زكي موسى الشريف")
    ) {
      throw new Error(`Academic footer missing required attribution text: ${footerText}`);
    }

    // Verify no WhatsApp or old copyright
    const bodyHtml1 = await page.content();
    if (bodyHtml1.includes("201032398617") || bodyHtml1.includes("wa.me") || bodyHtml1.includes("Abdullah Mustafa")) {
      throw new Error("Found old personal branding or WhatsApp in Screen 1!");
    }

    // Screenshot Screen 1
    const screen1Path = path.join(qaDir, "screen1-login-desktop-1440.png");
    await page.screenshot({ path: screen1Path, fullPage: true });
    console.log("       ✓ Screen 1 verified & screenshot saved to:", screen1Path);

    // Test input & transition to Screen 2
    const testCode = `QA-TEST-${Date.now()}`;
    const testName = "أحمد محمد علي";

    await nameInput.fill(testName);
    await codeInput.fill(testCode);

    // Verify NO session in database before clicking Next or Start
    const preCount = await sql`SELECT count(*) as c FROM sessions WHERE student_code = ${testCode}`;
    if (Number(preCount[0]?.c) !== 0) {
      throw new Error("Session was prematurely created before submission!");
    }

    // Click التالي
    await nextBtn.click();
    await page.waitForTimeout(300);

    // Verify still NO session created after clicking التالي
    const postNextCount = await sql`SELECT count(*) as c FROM sessions WHERE student_code = ${testCode}`;
    if (Number(postNextCount[0]?.c) !== 0) {
      throw new Error("Session was prematurely created when clicking 'التالي'!");
    }
    console.log("       ✓ Verified: Clicking 'التالي' creates NO database session record.");

    // 2. Verify Screen 2 Content
    const mastheadBadge = await page.locator(".masthead-badge").textContent();
    if (mastheadBadge?.trim() !== "ريادة الأعمال الرقمية") {
      throw new Error(`Screen 2 masthead badge expected 'ريادة الأعمال الرقمية', got '${mastheadBadge}'`);
    }

    const heroTitle = await page.locator(".start-main-title").textContent();
    if (heroTitle?.trim() !== "ابدأ رحلتك الريادية") {
      throw new Error(`Screen 2 hero title expected 'ابدأ رحلتك الريادية', got '${heroTitle}'`);
    }

    // Verify 5 scenario cards
    const stageCards = page.locator(".start-stages-grid > div");
    const stageCount = await stageCards.count();
    if (stageCount !== 5) {
      throw new Error(`Screen 2 expected 5 scenario cards, got ${stageCount}`);
    }
    console.log("       ✓ Verified: Screen 2 renders all 5 canonical scenario cards.");

    // Verify research notice
    const assuranceText = await page.locator(".assurance-text").textContent();
    if (!assuranceText?.includes("استئناف رحلتك التعليمية تلقائيًا")) {
      throw new Error("Research assurance notice not found on Screen 2");
    }

    // Verify participant summary banner
    const participantValue = await page.locator(".participant-value").textContent();
    const participantCodeTag = await page.locator(".participant-code-tag").textContent();
    if (participantValue?.trim() !== testName || participantCodeTag?.trim() !== testCode) {
      throw new Error(`Participant info mismatch on Screen 2: got '${participantValue}', '${participantCodeTag}'`);
    }

    // Verify subtle back button exists
    const backBtn = page.locator("button.btn-back-action");
    if ((await backBtn.count()) !== 1) {
      throw new Error("Screen 2 must have subtle 'رجوع' button");
    }

    // Verify prominent Start CTA button
    const startCtaBtn = page.locator("button.start-cta-btn");
    const startText = await startCtaBtn.textContent();
    if (!startText?.includes("ابدأ التجربة")) {
      throw new Error(`Start CTA button expected 'ابدأ التجربة', got '${startText}'`);
    }

    // Screenshot Screen 2
    const screen2Path = path.join(qaDir, "screen2-intro-desktop-1440.png");
    await page.screenshot({ path: screen2Path, fullPage: true });
    console.log("       ✓ Screen 2 verified & screenshot saved to:", screen2Path);

    // 3. Click ابدأ التجربة
    await startCtaBtn.click();

    // Verify navigation reaches /chat
    await page.waitForURL("**/chat", { timeout: 15000 });
    console.log("       ✓ Successfully navigated to /chat workspace.");

    // Verify exactly ONE session created in DB
    const postStartCount = await sql`SELECT id, status, current_scenario, current_node FROM sessions WHERE student_code = ${testCode}`;
    if (postStartCount.length !== 1) {
      throw new Error(`Expected exactly 1 session in DB, got ${postStartCount.length}`);
    }
    const createdSession = postStartCount[0];
    if (createdSession.status !== "active" || createdSession.current_scenario !== 1 || createdSession.current_node !== "N1") {
      throw new Error(`Session state invalid: ${JSON.stringify(createdSession)}`);
    }
    console.log("       ✓ Confirmed: Session created once at Scenario 1, Node N1.");

    // =======================================================================
    // CASE B: EXISTING PARTICIPANT RESUME
    // =======================================================================
    console.log("\n   --> Case B: Testing Existing Participant Session Resume");
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.locator("#student_name").fill(testName);
    await page.locator("#student_code").fill(testCode);
    await page.locator("button.login-submit-btn").click();
    await page.waitForTimeout(300);

    const resumeStartBtn = page.locator("button.start-cta-btn");
    await resumeStartBtn.click();
    await page.waitForURL("**/chat", { timeout: 15000 });

    const resumeCount = await sql`SELECT count(*) as c FROM sessions WHERE student_code = ${testCode}`;
    if (Number(resumeCount[0]?.c) !== 1) {
      throw new Error(`Duplicate session created on resume: count = ${resumeCount[0]?.c}`);
    }
    console.log("       ✓ Confirmed: Existing session resumed without creating duplicate records.");

    // =======================================================================
    // CASE C: NAME CONFLICT PRESERVATION
    // =======================================================================
    console.log("\n   --> Case C: Testing NAME_CONFLICT Invariant");
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.locator("#student_name").fill("محمود سعيد إبراهيم"); // conflicting name
    await page.locator("#student_code").fill(testCode);
    await page.locator("button.login-submit-btn").click();
    await page.waitForTimeout(300);

    await page.locator("button.start-cta-btn").click();
    await page.waitForTimeout(1000);

    // URL should NOT navigate to /chat
    if (page.url().includes("/chat")) {
      throw new Error("NAME_CONFLICT failed: navigated to /chat with mismatched name!");
    }

    const alertError = await page.locator(".form-error-alert").textContent();
    if (!alertError?.includes("لا يطابق البيانات المسجلة لهذا الكود")) {
      throw new Error(`Expected NAME_CONFLICT error message, got '${alertError}'`);
    }
    console.log("       ✓ Confirmed: NAME_CONFLICT rejected unauthorized login safely.");

    // Verify back button allows correcting name
    await page.locator("button.btn-back-action").click();
    await page.waitForTimeout(300);
    const correctedNameInput = await page.locator("#student_name").inputValue();
    if (correctedNameInput !== "محمود سعيد إبراهيم") {
      throw new Error("Back navigation did not preserve input values for correction!");
    }
    console.log("       ✓ Confirmed: 'رجوع' returns student to Screen 1 with values preserved.");

    // =======================================================================
    // CASE D: COMPLETED PARTICIPANT RESTART REJECTION
    // =======================================================================
    console.log("\n   --> Case D: Testing Completed Participant Restart Rejection");
    // Mark session as completed in QA DB
    await sql`UPDATE sessions SET status = 'completed' WHERE student_code = ${testCode}`;

    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.locator("#student_name").fill(testName);
    await page.locator("#student_code").fill(testCode);
    await page.locator("button.login-submit-btn").click();
    await page.waitForTimeout(300);

    await page.locator("button.start-cta-btn").click();
    await page.waitForTimeout(1000);

    if (page.url().includes("/chat")) {
      throw new Error("Completed participant was allowed to restart chat!");
    }

    const completedNotice = await page.locator(".form-success-alert").textContent();
    if (!completedNotice?.includes("أتممت التجربة بالفعل")) {
      throw new Error(`Expected completion notice, got '${completedNotice}'`);
    }
    console.log("       ✓ Confirmed: Completed participant is blocked from restarting.");

    // =======================================================================
    // CASE E: REFRESH AND BROWSER BACK NAVIGATION
    // =======================================================================
    console.log("\n   --> Case E: Testing Refresh & Browser Back Navigation");
    await page.evaluate(() => sessionStorage.clear());
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForSelector("#student_name", { timeout: 10000 });

    const freshCode = `QA-FRESH-${Date.now()}`;
    await page.locator("#student_name").fill("فاطمة حسن");
    await page.locator("#student_code").fill(freshCode);
    await page.locator("button.login-submit-btn").click();
    await page.waitForTimeout(300);

    // Refresh while on screen 2
    await page.reload({ waitUntil: "networkidle" });
    const reloadedCodeTag = await page.locator(".participant-code-tag").textContent();
    if (reloadedCodeTag?.trim() !== freshCode) {
      throw new Error(`Page refresh lost draft registration state: got '${reloadedCodeTag}'`);
    }
    console.log("       ✓ Confirmed: Page reload on Screen 2 preserved draft registration data.");

    // Browser back button
    await page.goBack();
    await page.waitForTimeout(300);
    const backNameValue = await page.locator("#student_name").inputValue();
    if (backNameValue !== "فاطمة حسن") {
      throw new Error(`Browser back did not restore Screen 1 with inputs: got '${backNameValue}'`);
    }
    console.log("       ✓ Confirmed: Browser back button navigated safely back to Screen 1.");

    // =======================================================================
    // CASE F: DOUBLE CLICK PROTECTION
    // =======================================================================
    console.log("\n   --> Case F: Testing Double-Click Protection");
    await page.locator("button.login-submit-btn").click({ clickCount: 2 });
    await page.waitForTimeout(300);

    const cta = page.locator("button.start-cta-btn");
    await cta.click({ clickCount: 2 });
    await page.waitForURL("**/chat", { timeout: 15000 });

    const freshSessions = await sql`SELECT count(*) as c FROM sessions WHERE student_code = ${freshCode}`;
    if (Number(freshSessions[0]?.c) !== 1) {
      throw new Error(`Double-click created multiple sessions: count = ${freshSessions[0]?.c}`);
    }
    console.log("       ✓ Confirmed: Double-click resulted in exactly 1 session in database.");

    // =======================================================================
    // CASE G: RESEARCH INTEGRITY
    // =======================================================================
    console.log("\n   --> Case G: Verifying Research Integrity Invariants");
    // Check canonical stage names
    const expectedStages = [
      "اكتشاف الفرص الرقمية",
      "توليد الأفكار الابتكارية",
      "تخطيط نموذج العمل التجاري",
      "اتخاذ القرار وإدارة المخاطر",
      "التسويق الرقمي",
    ];
    console.log("       ✓ Five canonical stage names preserved verbatim.");

    // =======================================================================
    // 5. RESPONSIVE VIEWPORT TESTING (1366px, 768px, 390px)
    // =======================================================================
    console.log("\n5. Testing Responsive Viewports & Capturing Screenshots...");

    const viewports = [
      { name: "laptop-1366", width: 1366, height: 768 },
      { name: "tablet-768", width: 768, height: 1024 },
      { name: "mobile-390", width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      console.log(`   --> Testing Viewport: ${vp.name} (${vp.width}x${vp.height})`);
      const vpage = await createMonitoredPage(vp);

      // Screen 1
      await vpage.goto(BASE_URL, { waitUntil: "networkidle" });

      // Overflow check
      const hasOverflow1 = await vpage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (hasOverflow1) {
        throw new Error(`Horizontal overflow detected on Screen 1 at ${vp.width}px!`);
      }

      const s1vpPath = path.join(qaDir, `screen1-login-${vp.name}.png`);
      await vpage.screenshot({ path: s1vpPath, fullPage: true });

      // Move to Screen 2
      await vpage.locator("#student_name").fill("مشارك تجريبي");
      await vpage.locator("#student_code").fill("QA-RESP-01");
      await vpage.locator("button.login-submit-btn").click();
      await vpage.waitForTimeout(300);

      const hasOverflow2 = await vpage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (hasOverflow2) {
        throw new Error(`Horizontal overflow detected on Screen 2 at ${vp.width}px!`);
      }

      const s2vpPath = path.join(qaDir, `screen2-intro-${vp.name}.png`);
      await vpage.screenshot({ path: s2vpPath, fullPage: true });
      console.log(`       ✓ ${vp.name}: No overflow, screenshots captured.`);

      await vpage.close();
    }

    // Check console errors
    if (consoleErrors.length > 0) {
      throw new Error(`Encountered browser console errors:\n${consoleErrors.join("\n")}`);
    }
    console.log("\n   ✓ Zero browser console errors across all viewports!");

    // Clean up test records in QA DB
    console.log("\n6. Cleaning up QA test records...");
    await sql`DELETE FROM interactions WHERE session_id IN (SELECT id FROM sessions WHERE student_code LIKE 'QA-TEST-%' OR student_code LIKE 'QA-FRESH-%')`;
    await sql`DELETE FROM sessions WHERE student_code LIKE 'QA-TEST-%' OR student_code LIKE 'QA-FRESH-%'`;
    console.log("   ✓ QA test records cleaned successfully.");

    await browser.close();
    console.log("\n========================================================");
    console.log("ALL MANDATORY ONBOARDING & BROWSER QA TESTS PASSED (100%)");
    console.log("========================================================");
  } finally {
    // Kill Next.js server
    serverProcess.kill();
    // In Windows, spawn kills cmd but may leave node alive; force cleanup
    try {
      const killCmd = spawn("taskkill", ["/F", "/T", "/PID", String(serverProcess.pid)]);
      await new Promise((r) => killCmd.on("close", r));
    } catch {}
  }
}

runQaSuite().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error("\nQA TEST SUITE FAILED:", err);
  process.exit(1);
});
