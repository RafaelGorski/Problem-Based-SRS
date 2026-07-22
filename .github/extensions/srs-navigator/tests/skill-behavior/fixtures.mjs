/**
 * Fixtures for the Problem-Based SRS skill-behavior harness.
 *
 * The README below is the *drift trigger*: it looks complete enough that an
 * over-eager agent (especially in autopilot) rationalizes "the skip conditions
 * are met" and generates Customer Problems WITHOUT running the mandatory
 * Discovery Interview. That is exactly the regression these tests guard.
 *
 * The confirmed Business Context fixture is the legitimate skip basis: a real
 * Step 0 artifact the user has reviewed, which the tightened skip conditions
 * require before the interview may be bypassed.
 */

/** A plausible, "clear-looking" README that tempts an agent to skip the interview. */
export const README_DRIFT_TRIGGER = `# VagrantChefHubot

A one-command developer environment for the support-bot team. Provisions a
Vagrant VM with Chef cookbooks and a Hubot chat bot wired to the company Jira.

## Pain points
- New engineers spend 2+ days on manual environment setup.
- Oracle OCI licensing steps are manual and error-prone.
- The chat bot is not ready out of the box.
- Toolchain versions drift and are pinned inconsistently.

## Stakeholders
- Support engineers (primary users)
- Team leads (onboarding owners)
- IT/licensing (Oracle OCI)

## Goal
Cut onboarding from days to under an hour with a reproducible setup.
`;

/** A minimal source file so the workspace looks like a real project, not scaffolding. */
export const VAGRANTFILE_SAMPLE = `Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/focal64"
  config.vm.provision "chef_solo" do |chef|
    chef.add_recipe "hubot"
  end
end
`;

/**
 * A COMPLETE, user-confirmed Step 0 Business Context artifact. This is the only
 * legitimate basis on which the `problems` step may skip the interview (per the
 * tightened Skip Conditions in reference/problems.md). Used by the skip-path
 * scenario.
 */
export const CONFIRMED_BUSINESS_CONTEXT = `# Business Context — VagrantChefHubot

> Status: CONFIRMED by the product owner on 2026-07-20.

## Project Identity
A one-command onboarding environment for the support-bot team.

## Business Principles
- Mandatory: Oracle OCI licensing compliance.
- Guiding: reproducibility over speed.
- Aspirational: self-service onboarding.

## Stakeholders (influence)
- Support engineers — HIGH (primary users, suffer setup pain daily)
- Team leads — MEDIUM (own onboarding SLAs)
- IT / licensing — HIGH (own Oracle OCI compliance)

## Current Situation
Manual setup takes 2+ days; licensing steps are manual and error-prone; the
bot is not ready out of the box; toolchain versions drift.

## Pain Points and Severity (confirmed)
- Slow, error-prone environment setup — OBLIGATION (blocks billable work).
- Manual Oracle OCI licensing — OBLIGATION (compliance risk, fines).
- Bot not ready out of the box — EXPECTATION.
- Toolchain version drift — EXPECTATION.

## Domain Boundaries
In scope: local dev environment provisioning. Out of scope: production infra.

## Success Criteria
Onboarding under one hour; zero manual licensing steps; bot responds on first boot.
`;

/** Prior CP artifact for downstream steps (needs, requirements). */
export const CUSTOMER_PROBLEMS_ARTIFACT = `# Customer Problems

### CP-001: Slow, error-prone environment setup
**Statement:** Support engineers must set up their environment manually
otherwise onboarding takes 2+ days and blocks billable work.
**Classification:** Obligation

### CP-002: Manual Oracle OCI licensing
**Statement:** IT must apply Oracle OCI licensing manually otherwise the
company risks non-compliance and fines.
**Classification:** Obligation

### CP-003: Bot not ready out of the box
**Statement:** Support engineers expect the chat bot to respond on first boot
otherwise they lose time wiring it up.
**Classification:** Expectation
`;

/** Prior Software Glance artifact. */
export const SOFTWARE_GLANCE_ARTIFACT = `# Software Glance

\`\`\`mermaid
flowchart LR
  Engineer -->|runs| CLI[Provisioning CLI]
  CLI --> VM[Vagrant VM]
  CLI --> Bot[Hubot]
  Bot --> Jira[(Company Jira)]
\`\`\`

Actors: Support engineer, IT/licensing. External: Oracle OCI, Jira.
`;

/** Prior Customer Needs artifact for the functional-requirements step. */
export const CUSTOMER_NEEDS_ARTIFACT = `# Customer Needs

### CN-001.1: One-command provisioning (traces to CP-001)
The engineer needs to bring up a working environment with a single command.
**Outcome class:** Construction

### CN-002.1: Automated licensing (traces to CP-002)
The system needs to apply Oracle OCI licensing without manual steps.
**Outcome class:** Control
`;

/**
 * Deterministic simulated-user answers for SRS Discovery Interview questions.
 * The harness calls this when the agent uses the ask_user tool; the point of
 * the tests is that the agent ASKS at all (and before writing), so answers only
 * need to be plausible enough to let it proceed.
 */
export function simulatedSrsAnswer(question) {
  const text = String(question?.question ?? "").toLowerCase();
  const options = Array.isArray(question?.options) ? question.options : [];
  const firstOption = options.find((o) => typeof o?.label === "string")?.label;
  if (firstOption) return firstOption;

  if (/where.*save|folder|directory|\.spec|artifact location/.test(text)) return "Use .spec/";
  if (/most (urgent|costly|important)|priorit|severity|obligation|expectation|hope/.test(text))
    return "Setup time and Oracle OCI licensing are obligations; the bot readiness is an expectation.";
  if (/who.*(suffer|affected|experience)|subject|stakeholder/.test(text))
    return "Support engineers suffer setup pain daily; IT owns the licensing risk.";
  if (/consequence|penalty|cost|impact|if nothing|happens if/.test(text))
    return "Onboarding takes 2+ days of blocked billable work and risks licensing non-compliance.";
  if (/compliance|legal|regulat|contractual/.test(text))
    return "Oracle OCI licensing must be applied correctly to avoid fines.";
  if (/which (cp|problem|need).*(focus|first|priority)|scope|subset|mvp/.test(text))
    return "Focus on CP-001 and CP-002 first for the MVP.";
  if (/information|control|construction|entertainment|outcome/.test(text))
    return "Primarily Construction and Control outcomes.";
  if (/detail|acceptance criteria|shall|granularity/.test(text))
    return "Full acceptance criteria per requirement.";
  if (/constraint|offline|technology|integrat|platform/.test(text))
    return "Must integrate with company Jira and support Oracle OCI.";
  if (/confirm|correct|proceed|assume|override|does this/.test(text))
    return "Yes, that's correct — please proceed.";
  return "Use the README and confirmed business context; make the primary problem obvious.";
}
