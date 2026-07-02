# Business Brief — "RelayDesk" Customer Support Platform

RelayDesk is a mid-sized B2B SaaS company selling a customer-support ticketing
product to other businesses. This brief is deliberately written the way a
stakeholder would speak — a mix of problems, complaints, and half-formed
solution ideas — so the methodology can separate problems from solutions.

## Context

- Support agents handle tickets from email, chat, and a web form.
- The company has grown from 20 to 120 agents in 18 months.
- Leadership wants to "add an AI chatbot and a mobile app" to fix things.

## What stakeholders are saying

- **Head of Support:** "Agents miss our contractual 4-hour first-response SLA on
  about 15% of high-priority tickets. When we breach, we owe service credits, and
  last quarter that cost us $180k in credits. I have no early warning before a
  breach happens."
- **Senior Agent:** "The same customer question arrives five times and each agent
  answers from scratch. There's no shared, trustworthy answer. New hires take
  6 weeks to get productive because knowledge lives in people's heads."
- **Compliance Officer:** "We are contractually and legally required to keep an
  auditable record of every change to a ticket for 7 years. Today edits overwrite
  each other and we cannot reconstruct who changed what."
- **CFO:** "Whatever we build must not increase per-agent licensing cost; margins
  are already thin."
- **VP Product:** "It would be nice if managers could see a live dashboard of team
  workload, but that's not why customers churn."

## Constraints

- Must integrate with the existing email and chat providers.
- Data residency: EU customer data must stay in the EU.
- Rollout target: usable by all 120 agents within two quarters.

## Success signals leadership named

- Cut SLA breaches on high-priority tickets by at least half.
- New-hire ramp time down from 6 weeks to 3.
- Zero audit findings on ticket history in the annual review.
