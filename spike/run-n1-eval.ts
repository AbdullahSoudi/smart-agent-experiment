import fs from "node:fs";
import path from "node:path";
import { evaluateN1, loadEnv } from "./evaluate-n1.js";
import type { Classification } from "./types.js";

loadEnv();

interface CsvRow {
  id: string;
  student_answer: string;
  researcher_label: Classification;
  source: string;
}

interface EvalResultRow {
  id: string;
  student_answer: string;
  researcher_label: Classification;
  gemini_classification: string;
  match: "true" | "false";
  feedback: string;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let inQuotes = false;
  let field = "";
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

function escapeCsvField(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const templatePath = path.resolve("data/n1_eval_template.csv");
  const resultsPath = path.resolve("data/n1_eval_results.csv");

  if (!fs.existsSync(templatePath)) {
    console.error(`Error: Template file not found at ${templatePath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(templatePath, "utf8");
  const lines = fileContent.trim().split(/\r?\n/);
  if (lines.length < 25) {
    console.error(`Error: Expected at least 25 lines (header + 24 rows), got ${lines.length}`);
    process.exit(1);
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i <= 24; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length < 4) {
      console.error(`Error: Invalid row at line ${i + 1}`);
      process.exit(1);
    }
    rows.push({
      id: fields[0].trim(),
      student_answer: fields[1],
      researcher_label: fields[2].trim() as Classification,
      source: fields[3].trim(),
    });
  }

  console.log(`Loaded ${rows.length} reference examples from data/n1_eval_template.csv.`);
  console.log(`Starting sequential Gemini evaluations using model: ${process.env.AI_MODEL || "openai/gpt-oss-120b"}\n`);

  const results: EvalResultRow[] = [];
  let technicalFailures = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    console.log(`[${i + 1}/${rows.length}] Evaluating ${row.id}...`);

    let evalResult: { classification: Classification; feedback: string } | null = null;
    let attempts = 0;
    const maxAttempts = 2; // Allow at most 1 technical retry for transient 503/429

    while (attempts < maxAttempts && !evalResult) {
      attempts++;
      try {
        // ONLY student_answer is passed. researcher_label is NEVER sent.
        evalResult = await evaluateN1(row.student_answer);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`  Attempt ${attempts} failed for ${row.id}: ${errMsg}`);
        if (
          attempts < maxAttempts &&
          (errMsg.includes("503") ||
            errMsg.includes("429") ||
            errMsg.includes("UNAVAILABLE") ||
            errMsg.includes("high demand") ||
            errMsg.includes("resource has been exhausted"))
        ) {
          console.log(`  Transient technical error detected. Waiting 5s before retry...`);
          await sleep(5000);
        } else {
          console.error(`  Technical failure on ${row.id}.`);
          break;
        }
      }
    }

    if (evalResult) {
      const isMatch = evalResult.classification === row.researcher_label;
      results.push({
        id: row.id,
        student_answer: row.student_answer,
        researcher_label: row.researcher_label,
        gemini_classification: evalResult.classification,
        match: isMatch ? "true" : "false",
        feedback: evalResult.feedback,
      });
      console.log(`  -> Gemini: ${evalResult.classification} | Ref: ${row.researcher_label} | Match: ${isMatch}`);
    } else {
      technicalFailures++;
      results.push({
        id: row.id,
        student_answer: row.student_answer,
        researcher_label: row.researcher_label,
        gemini_classification: "ERROR",
        match: "false",
        feedback: "Technical Failure",
      });
    }

    // Delay 1.5s between calls to avoid rate limits
    if (i < rows.length - 1) {
      await sleep(1500);
    }
  }

  // Write results to data/n1_eval_results.csv
  const csvLines = ["id,student_answer,researcher_label,gemini_classification,match,feedback"];
  for (const r of results) {
    csvLines.push(
      [
        escapeCsvField(r.id),
        escapeCsvField(r.student_answer),
        escapeCsvField(r.researcher_label),
        escapeCsvField(r.gemini_classification),
        escapeCsvField(r.match),
        escapeCsvField(r.feedback),
      ].join(",")
    );
  }

  fs.writeFileSync(resultsPath, csvLines.join("\n") + "\n", "utf8");
  console.log(`\nWrote ${results.length} result rows to ${resultsPath}\n`);

  // Summary statistics
  const total = results.length;
  const successful = total - technicalFailures;
  const matches = results.filter((r) => r.match === "true").length;
  const overallAccuracy = (matches / total) * 100;

  const classes: Classification[] = ["advanced", "medium", "weak"];
  const classStats: Record<Classification, { total: number; matched: number }> = {
    advanced: { total: 0, matched: 0 },
    medium: { total: 0, matched: 0 },
    weak: { total: 0, matched: 0 },
  };

  // Confusion matrix: ref -> predicted -> count
  const matrix: Record<string, Record<string, number>> = {
    advanced: { advanced: 0, medium: 0, weak: 0, ERROR: 0 },
    medium: { advanced: 0, medium: 0, weak: 0, ERROR: 0 },
    weak: { advanced: 0, medium: 0, weak: 0, ERROR: 0 },
  };

  const mismatchedIds: string[] = [];

  for (const r of results) {
    const ref = r.researcher_label;
    const pred = r.gemini_classification;
    classStats[ref].total++;
    if (r.match === "true") {
      classStats[ref].matched++;
    } else {
      mismatchedIds.push(r.id);
    }
    if (matrix[ref] && matrix[ref][pred] !== undefined) {
      matrix[ref][pred]++;
    }
  }

  console.log("==================================================");
  console.log("             N1 EVALUATION SUMMARY                ");
  console.log("==================================================");
  console.log(`Total Examples:          ${total}`);
  console.log(`Successful Evaluations:  ${successful}`);
  console.log(`Technical Failures:      ${technicalFailures}`);
  console.log(`Exact Matches:           ${matches} / ${total}`);
  console.log(`Overall Accuracy:        ${overallAccuracy.toFixed(1)}%`);
  console.log("--------------------------------------------------");
  console.log("Accuracy by Reference Class:");
  for (const c of classes) {
    const s = classStats[c];
    const acc = s.total > 0 ? (s.matched / s.total) * 100 : 0;
    console.log(`  - ${c.padEnd(8)}: ${s.matched}/${s.total} (${acc.toFixed(1)}%)`);
  }
  console.log("--------------------------------------------------");
  console.log("Confusion Matrix (Rows = Reference, Columns = Gemini):");
  console.log("Ref \\ Pred  | advanced | medium | weak | ERROR");
  console.log("------------+----------+--------+------+------");
  for (const c of classes) {
    const row = matrix[c];
    console.log(
      `${c.padEnd(11)} | ${String(row.advanced).padEnd(8)} | ${String(row.medium).padEnd(6)} | ${String(row.weak).padEnd(4)} | ${row.ERROR}`
    );
  }
  console.log("--------------------------------------------------");
  console.log(`Mismatched Example IDs (${mismatchedIds.length}): ${mismatchedIds.join(", ") || "None"}`);
  console.log("==================================================");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Fatal Runner Error:", err);
    process.exit(1);
  });
