/**
 * Multi-provider model factory for the Problem-Based SRS skill-behavior harness.
 *
 * Modeled on pbakaus/impeccable's skill-behavior/providers.mjs: one tiny,
 * env-key-gated factory that returns a Vercel AI SDK model for whichever
 * provider a model id belongs to. Providers without a key are SKIPPED (not
 * failed) so the suite is safe to run in CI without secrets.
 *
 * Note: this repo installs `ai` v4 (`@ai-sdk/*` v4). The tool/loop API differs
 * from impeccable's v5 harness (`parameters` schema + `maxSteps`), which the
 * sibling harness.mjs accounts for.
 */
import { anthropic, createAnthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/skill-behavior -> repo root is five levels up.
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..", "..");

/**
 * Minimal .env loader (no dependency). Looks for a .env at the repo root and,
 * as a convenience, at the extension root, so keys can live next to either.
 */
function loadEnv() {
  const candidates = [
    path.join(REPO_ROOT, ".env"),
    path.resolve(__dirname, "..", "..", ".env"),
  ];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const text = fs.readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (!process.env[key]) process.env[key] = value;
    }
  }
}
loadEnv();

export const PROVIDERS = {
  anthropic: { envKey: "ANTHROPIC_API_KEY", label: "Anthropic" },
  openai: { envKey: "OPENAI_API_KEY", label: "OpenAI" },
  google: { envKey: "GOOGLE_GENERATIVE_AI_API_KEY", label: "Google" },
  deepseek: { envKey: "DEEPSEEK_API_KEY", label: "DeepSeek" },
};

export function detectProvider(modelId) {
  if (modelId.startsWith("claude-")) return "anthropic";
  if (modelId.startsWith("gpt-") || modelId.startsWith("o1") || modelId.startsWith("o3")) return "openai";
  if (modelId.startsWith("gemini-")) return "google";
  if (modelId.startsWith("deepseek-")) return "deepseek";
  throw new Error(`Unsupported model id: "${modelId}"`);
}

export function hasKey(provider) {
  const meta = PROVIDERS[provider];
  if (!meta) return false;
  if (provider === "google") {
    return Boolean(
      process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_CLOUD_API_KEY,
    );
  }
  return Boolean(process.env[meta.envKey]);
}

export function getModel(modelId) {
  const provider = detectProvider(modelId);
  if (provider === "anthropic") return anthropic(modelId);
  if (provider === "openai") return openai(modelId);
  if (provider === "google") {
    // Some setups store the key under GOOGLE_CLOUD_API_KEY; the SDK reads
    // GOOGLE_GENERATIVE_AI_API_KEY. Mirror it so either works.
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && process.env.GOOGLE_CLOUD_API_KEY) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_CLOUD_API_KEY;
    }
    return google(modelId);
  }
  if (provider === "deepseek") {
    // DeepSeek exposes an Anthropic-compatible endpoint.
    const deepseek = createAnthropic({
      baseURL: "https://api.deepseek.com/anthropic",
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
    return deepseek(modelId);
  }
  throw new Error(`Unsupported provider: ${provider}`);
}

/**
 * Default model lineup: current, economical members of each family. This suite
 * measures the interview/loading PROTOCOL, not output quality, so cheap tiers
 * are fine. Override with SRS_SKILL_BEHAVIOR_MODELS=claude-foo,gpt-bar.
 */
export const DEFAULT_MODELS = [
  "claude-3-5-haiku-latest",
  "gpt-4o-mini",
  "gemini-1.5-flash",
];

export function resolveModelList() {
  const override = process.env.SRS_SKILL_BEHAVIOR_MODELS;
  if (override && override.trim()) {
    return override.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return DEFAULT_MODELS;
}
