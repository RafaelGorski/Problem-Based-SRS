// A pure validator for the commands documented in `evals/README.md`.
//
// Why this exists: issue #55 reported that the eval docs named commands that did
// not exist — `npm test` inside `evals/`, a phantom `evals/package.json`, and
// `node --test tests/` (a bare directory, which node does not support). The fix
// shipped, but nothing guarded it, so the fix was one edit away from regressing.
//
// This module deliberately does NOT execute anything. Two reasons:
//   1. The documented whole-suite commands include the very test that calls this
//      validator, so running them would recurse forever.
//   2. The file also documents opt-in/live commands that need a provider key or
//      an authenticated `copilot` CLI and may consume paid requests.
//
// So commands are split into two classes and checked accordingly:
//   * OFFLINE-EXECUTABLE — proven by running the suite itself; here we only assert
//     that the runner/target files they name exist on disk.
//   * OPT-IN / LIVE — checked structurally: the script they invoke must exist and
//     the path must be repo-root relative.

/** Fenced-code languages that can contain runnable commands. */
const SHELL_LANGS = new Set(["bash", "sh", "shell", "console", "powershell", "pwsh", "ps1"]);

/** Command leaders we treat as "a command line" rather than prose. */
const RUNNERS = ["pwsh", "node", "npm", "npx", "python", "py"];

/**
 * Extract fenced code blocks from markdown.
 * @param {string} md
 * @returns {{lang: string, body: string, line: number}[]}
 */
export function codeBlocks(md) {
  const out = [];
  const lines = String(md ?? "").split(/\r?\n/);
  let open = null;
  lines.forEach((line, i) => {
    const fence = line.match(/^\s*```(\w*)\s*$/);
    if (!fence) {
      if (open) open.lines.push(line);
      return;
    }
    if (open) {
      out.push({ lang: open.lang, body: open.lines.join("\n"), line: open.line });
      open = null;
    } else {
      open = { lang: (fence[1] || "").toLowerCase(), lines: [], line: i + 1 };
    }
  });
  return out;
}

/** Strip a trailing `# comment` that is not inside quotes. */
function stripComment(text) {
  const idx = text.indexOf(" #");
  return (idx >= 0 ? text.slice(0, idx) : text).trim();
}

/**
 * Parse every documented command line out of the README's shell code blocks.
 *
 * A "command" is a line whose first bare word (after any `KEY=value` prefixes) is
 * one of {@link RUNNERS}. Everything else — prose, layout trees, JS snippets — is
 * ignored, so this stays a contract checker and never becomes a shell parser.
 *
 * @param {string} md README text
 * @returns {{raw: string, runner: string, args: string[], lang: string, line: number}[]}
 */
export function parseCommands(md) {
  const out = [];
  for (const block of codeBlocks(md)) {
    if (!SHELL_LANGS.has(block.lang)) continue;
    block.body.split(/\r?\n/).forEach((rawLine, offset) => {
      const text = stripComment(rawLine);
      if (!text || text.startsWith("#")) return;
      const tokens = text.split(/\s+/).filter(Boolean);
      // Drop leading `ENV=value` assignments (e.g. RUN_SKILL_EVALS=1 node ...).
      let i = 0;
      while (i < tokens.length && /^[A-Z_][A-Z0-9_]*=/.test(tokens[i])) i += 1;
      const runner = tokens[i];
      if (!RUNNERS.includes(runner)) return;
      out.push({
        raw: text,
        runner,
        args: tokens.slice(i + 1),
        lang: block.lang,
        line: block.line + offset + 1,
      });
    });
  }
  return out;
}

/**
 * Repo-root-relative script paths a command references (`.mjs`, `.ps1`, `.py`, `.js`).
 *
 * A path must contain a `/` to count. Bare filenames in this README are always
 * *parameter values* (`-File skills-static.test.mjs`), not repo-root paths, and
 * are checked separately by {@link runnerFileArgs}.
 *
 * @param {{args: string[]}} cmd
 * @returns {string[]}
 */
export function referencedPaths(cmd) {
  return cmd.args.filter(
    (a) => !a.startsWith("-") && a.includes("/") && /\.(mjs|js|ps1|py)$/.test(a),
  );
}

/**
 * Values passed to the offline runner's `-File` switch, which names a file inside
 * `evals/tests/`. Documenting a `-File` target that no longer exists is exactly the
 * kind of drift this guard is for.
 * @param {{args: string[]}} cmd
 * @returns {string[]}
 */
export function runnerFileArgs(cmd) {
  const out = [];
  cmd.args.forEach((arg, i) => {
    if (!/^-{1,2}File$/i.test(arg)) return;
    const value = cmd.args[i + 1];
    if (value && !value.startsWith("-")) out.push(value);
  });
  return out;
}

/** True when the command is one of the model-calling, opt-in ones. */
export function isLiveCommand(cmd) {
  return /run-evals/.test(cmd.raw) || /test:skill-behavior/.test(cmd.raw);
}

/**
 * Commands the README must keep documenting. These are the exact entrypoints that
 * drifted in #55 — if any disappears or is renamed, the guard fails loudly rather
 * than silently letting the docs describe a runner that no longer exists.
 *
 * Patterns are matched against *parsed* command lines (comments and env prefixes
 * already stripped), never against the raw markdown, so an inline `# comment` on a
 * documented command does not defeat the guard.
 */
export const REQUIRED_COMMANDS = [
  {
    id: "offline-pwsh-runner",
    klass: "offline-executable",
    pattern: /^pwsh evals\/scripts\/run-tests\.ps1$/,
    describe: "pwsh evals/scripts/run-tests.ps1",
  },
  {
    id: "offline-node-test",
    klass: "offline-executable",
    pattern: /^node --test evals\/tests\/\*\.test\.mjs$/,
    describe: "node --test evals/tests/*.test.mjs",
  },
  {
    id: "live-run-evals",
    klass: "opt-in",
    pattern: /^node evals\/run-evals\.mjs\b/,
    describe: "node evals/run-evals.mjs",
  },
];

/** A bare-directory `node --test <dir>` form, which Node does not support. */
export function bareDirectoryTestTargets(commands) {
  const bad = [];
  for (const cmd of commands) {
    if (cmd.runner !== "node" || !cmd.args.includes("--test")) continue;
    for (const arg of cmd.args) {
      if (arg.startsWith("-")) continue;
      if (arg.includes("*") || /\.(mjs|js|cjs)$/.test(arg)) continue;
      bad.push({ command: cmd.raw, target: arg, line: cmd.line });
    }
  }
  return bad;
}

/**
 * Validate the README text against the contract.
 *
 * @param {string} md README text (passed in, so tests can mutate a copy in memory)
 * @param {(relPath: string) => boolean} exists resolves a repo-root-relative path
 * @returns {{ok: boolean, errors: string[], commands: ReturnType<typeof parseCommands>}}
 */
export function validateEvalsReadme(md, exists) {
  const errors = [];
  const commands = parseCommands(md);

  // 1. The phantom manifest must stay gone: it never existed, and documenting it
  //    sent contributors looking for an `npm test` that could not work.
  if (/evals\/package\.json/.test(md) || /^\s*├──\s*package\.json/m.test(md)) {
    errors.push("README references evals/package.json, which does not exist");
  }
  if (exists("evals/package.json")) {
    errors.push("evals/package.json exists on disk — the eval harness must stay manifest-free");
  }

  // 2. No `npm` command may be documented as running inside evals/.
  for (const cmd of commands) {
    if (cmd.runner === "npm" && !/--prefix/.test(cmd.raw)) {
      errors.push(`README documents "${cmd.raw}" — evals/ has no package.json to run npm in`);
    }
  }

  // 3. `node --test` needs explicit files or a glob, never a bare directory.
  for (const bad of bareDirectoryTestTargets(commands)) {
    errors.push(
      `README documents "${bad.command}" — node --test does not accept the bare directory "${bad.target}"`,
    );
  }

  // 4. Every runner/target file named by a command must exist.
  for (const cmd of commands) {
    for (const ref of referencedPaths(cmd)) {
      if (ref.includes("*")) continue;
      if (!exists(ref)) {
        errors.push(`README command "${cmd.raw}" references missing file "${ref}"`);
      }
    }
    for (const file of runnerFileArgs(cmd)) {
      if (!exists(`evals/tests/${file}`)) {
        errors.push(`README command "${cmd.raw}" names missing test file "evals/tests/${file}"`);
      }
    }
  }

  // 5. Live commands must be repo-root relative too, so a reader can paste any
  //    documented command from one place. `node run-evals.mjs` only worked after
  //    an undocumented `cd evals`.
  for (const cmd of commands) {
    if (!isLiveCommand(cmd)) continue;
    for (const arg of cmd.args) {
      if (/^run-evals\.mjs$/.test(arg)) {
        errors.push(
          `README command "${cmd.raw}" is not repo-root relative — use evals/run-evals.mjs`,
        );
      }
    }
  }

  // 6. The entrypoints that previously drifted must still be documented verbatim.
  for (const required of REQUIRED_COMMANDS) {
    if (!commands.some((c) => required.pattern.test(c.raw))) {
      errors.push(`README must document the ${required.klass} command \`${required.describe}\``);
    }
  }

  return { ok: errors.length === 0, errors, commands };
}
