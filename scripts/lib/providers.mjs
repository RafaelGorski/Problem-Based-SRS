/**
 * Provider-specific placeholders for Problem-Based SRS skills.
 *
 * Defines per-provider placeholder values for the skill build system.
 * Each provider gets its own ask_instruction that tells the agent
 * HOW to stop and ask the user clarifying questions.
 */

export const PROVIDER_PLACEHOLDERS = {
  'github-copilot': {
    model: 'the model',
    ask_instruction:
      'STOP and ask the user to clarify what you cannot infer. Use the ask_user tool if available; otherwise ask directly in chat and wait for an answer.',
    command_prefix: '/',
  },
  'claude-code': {
    model: 'Claude',
    ask_instruction: 'STOP and call the AskUserQuestion tool to clarify.',
    command_prefix: '/',
  },
  'cursor': {
    model: 'the model',
    ask_instruction:
      'ask the user directly to clarify what you cannot infer.',
    command_prefix: '/',
  },
  'codex': {
    model: 'GPT',
    ask_instruction:
      "STOP and use Codex's structured user-input/question tool when available; if unavailable, ask directly in chat to clarify what you cannot infer.",
    command_prefix: '$',
  },
  'gemini': {
    model: 'Gemini',
    ask_instruction:
      'ask the user directly to clarify what you cannot infer.',
    command_prefix: '/',
  },
};

/** Default provider when none is specified. */
export const DEFAULT_PROVIDER = 'github-copilot';

/**
 * Replace template placeholders in content with provider-specific values.
 *
 * Supported placeholders:
 *   {{model}}            - Model name
 *   {{ask_instruction}}  - How to ask the user for clarification
 *   {{command_prefix}}   - Slash command prefix (/ or $)
 *
 * @param {string} content - Source content with {{placeholders}}
 * @param {string} provider - Provider key from PROVIDER_PLACEHOLDERS
 * @returns {string} Content with placeholders replaced
 */
export function replacePlaceholders(content, provider) {
  const placeholders =
    PROVIDER_PLACEHOLDERS[provider] ||
    PROVIDER_PLACEHOLDERS[DEFAULT_PROVIDER];

  return content
    .replace(/\{\{model\}\}/g, placeholders.model)
    .replace(/\{\{ask_instruction\}\}/g, placeholders.ask_instruction)
    .replace(/\{\{command_prefix\}\}/g, placeholders.command_prefix);
}
