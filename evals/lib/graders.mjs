// Grading utilities for skill evaluations.
//
// A "rubric" is an array of checks. Each check produces a pass/fail with a
// weight, and gradeRubric() aggregates them into a normalized score. Checks are
// plain functions of the artifact text, so both the deterministic static evals
// and the live LLM evals share the same grading core.
//
// An optional LLM judge (llmJudge) grades qualitative criteria by delegating to
// an injected `invoke` function (normally runCopilot) — injectable so it can be
// unit-tested with a stub.

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/**
 * Count non-overlapping matches of a pattern in text.
 * @param {string} text
 * @param {string|RegExp} pattern
 * @returns {number}
 */
export function countMatches(text, pattern) {
  const src = pattern instanceof RegExp ? pattern.source : escapeRegExp(pattern);
  const flags = pattern instanceof RegExp && pattern.flags.includes("g")
    ? pattern.flags
    : ((pattern instanceof RegExp ? pattern.flags : "") + "g");
  const re = new RegExp(src, flags);
  const matches = String(text ?? "").match(re);
  return matches ? matches.length : 0;
}

/**
 * True when text contains the pattern (substring case-insensitive, or RegExp).
 * @param {string} text
 * @param {string|RegExp} pattern
 * @returns {boolean}
 */
export function includesPattern(text, pattern) {
  if (pattern instanceof RegExp) return pattern.test(String(text ?? ""));
  return String(text ?? "").toLowerCase().includes(String(pattern).toLowerCase());
}

/**
 * Build a check from an arbitrary predicate.
 * @param {string} id
 * @param {string} description
 * @param {(text:string)=>(boolean|{pass:boolean, detail?:string})} run
 * @param {{weight?:number, required?:boolean}} [opts]
 */
export function check(id, description, run, opts = {}) {
  return { id, description, run, weight: opts.weight ?? 1, required: !!opts.required };
}

/**
 * A check that passes when the pattern appears at least `min` times.
 * @param {string} id
 * @param {string} description
 * @param {string|RegExp} pattern
 * @param {{min?:number, weight?:number, required?:boolean}} [opts]
 */
export function patternCheck(id, description, pattern, opts = {}) {
  const min = opts.min ?? 1;
  return check(id, description, (text) => {
    const n = countMatches(text, pattern);
    return { pass: n >= min, detail: `found ${n} (need >= ${min})` };
  }, opts);
}

/**
 * A check that passes when the (anti-)pattern is ABSENT — for catching
 * forbidden content such as solution language or legacy commands.
 * @param {string} id
 * @param {string} description
 * @param {string|RegExp} pattern
 * @param {{weight?:number, required?:boolean}} [opts]
 */
export function absenceCheck(id, description, pattern, opts = {}) {
  return check(id, description, (text) => {
    const n = countMatches(text, pattern);
    return { pass: n === 0, detail: n === 0 ? "absent" : `found ${n} forbidden` };
  }, opts);
}

/**
 * Grade text against a rubric (array of checks).
 * @param {string} text
 * @param {Array} rubric
 * @param {{threshold?:number}} [opts]
 * @returns {{score:number, maxScore:number, ratio:number, passed:boolean, results:Array, requiredFailures:Array}}
 */
export function gradeRubric(text, rubric, opts = {}) {
  const threshold = opts.threshold ?? 0.7;
  const results = (rubric ?? []).map((c) => {
    let raw;
    try {
      raw = c.run(text);
    } catch (e) {
      raw = { pass: false, detail: `error: ${e.message}` };
    }
    const norm = typeof raw === "boolean" ? { pass: raw } : (raw || { pass: false });
    return {
      id: c.id,
      description: c.description,
      weight: c.weight ?? 1,
      required: !!c.required,
      pass: !!norm.pass,
      detail: norm.detail ?? "",
    };
  });

  const maxScore = results.reduce((a, r) => a + r.weight, 0);
  const score = results.reduce((a, r) => a + (r.pass ? r.weight : 0), 0);
  const ratio = maxScore === 0 ? 0 : score / maxScore;
  const requiredFailures = results.filter((r) => r.required && !r.pass);
  const passed = requiredFailures.length === 0 && ratio >= threshold;
  return { score, maxScore, ratio, passed, results, requiredFailures };
}

/**
 * Build the prompt that asks a model to grade an artifact against qualitative
 * criteria and reply with a JSON verdict.
 * @param {string} artifact
 * @param {string[]} criteria
 * @returns {string}
 */
export function buildJudgePrompt(artifact, criteria) {
  const list = (criteria ?? []).map((c, i) => `${i + 1}. ${c}`).join("\n");
  return [
    "You are a strict evaluator for a requirements-engineering methodology.",
    "Grade the ARTIFACT below against these CRITERIA:",
    list,
    "",
    "Respond with ONLY a single JSON object on one line, no prose, of the form:",
    '{"score": <number 0..1>, "reasoning": "<one sentence>"}',
    "score is the fraction of criteria the artifact satisfies.",
    "",
    "=== ARTIFACT START ===",
    String(artifact ?? ""),
    "=== ARTIFACT END ===",
  ].join("\n");
}

/**
 * Parse a judge verdict from model text. Accepts a JSON object with a `score`
 * field, or falls back to an `N/M` fraction or a bare 0..1 number.
 * @param {string} text
 * @returns {{score:number, reasoning:string}}
 */
export function parseJudgeVerdict(text) {
  const s = String(text ?? "");
  const obj = s.match(/\{[^{}]*"score"[^{}]*\}/);
  if (obj) {
    try {
      const parsed = JSON.parse(obj[0]);
      return { score: clamp01(parsed.score), reasoning: String(parsed.reasoning ?? "") };
    } catch {
      // fall through
    }
  }
  const frac = s.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (frac) {
    const denom = Number(frac[2]);
    return { score: denom ? clamp01(Number(frac[1]) / denom) : 0, reasoning: "parsed fraction" };
  }
  const num = s.match(/\b(0(?:\.\d+)?|1(?:\.0+)?)\b/);
  if (num) return { score: clamp01(num[1]), reasoning: "parsed number" };
  return { score: 0, reasoning: "unparseable verdict" };
}

/**
 * Grade an artifact with an LLM judge.
 * @param {string} artifact
 * @param {object} opts
 * @param {string[]} opts.criteria
 * @param {(prompt:string, o?:object)=>Promise<{text:string}|string>} opts.invoke
 * @param {string} [opts.model]
 * @param {number} [opts.threshold]
 * @returns {Promise<{score:number, reasoning:string, passed:boolean}>}
 */
export async function llmJudge(artifact, opts) {
  const { criteria, invoke, model, threshold = 0.7 } = opts;
  const prompt = buildJudgePrompt(artifact, criteria);
  const res = await invoke(prompt, { model });
  const text = typeof res === "string" ? res : (res && res.text) || "";
  const verdict = parseJudgeVerdict(text);
  return { ...verdict, passed: verdict.score >= threshold };
}
