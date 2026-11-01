# VS Code + Codex local setup

## Requirements
VS Code (recent), Git, Node.js active LTS, package manager (pnpm recommended), signed-in GitHub, and access to OpenAI Codex extension/account. Do not install Claude Code or godark.

## Procedure
1. Clone the **private** repository in your terminal: git clone https://github.com/strakhovdenya/home-budget.git
2. Open the cloned folder in VS Code (File → Open Folder), trust only the known repository.
3. In Extensions, search for the official **Codex – OpenAI's coding agent** by OpenAI, install it, and authenticate with your ChatGPT/OpenAI account using the extension's current UI.
4. Open Codex chat **with home-budget folder as workspace**, ask it to read AGENTS.md and docs/BUSINESS_RULES.md. Repository skills in .agents/skills/*/SKILL.md are available to Codex.
5. For the **first task**, ask Codex: 'Read AGENTS.md, docs/PRD.md, docs/BUSINESS_RULES.md, docs/IMPLEMENTATION_PLAN.md, docs/TASKS.md and docs/OPEN_QUESTIONS.md. Work only on HB-001. Draft an ADR and synthetic acceptance scenarios for checkpoint net movements and financial-month allocations; do not scaffold application code. Show me the proposed diff for review.'
6. Work on a feature branch; inspect changes and diff; never expose credentials or production bank exports.
7. When project code exists, install dependencies and use the documented scripts (test, lint, typecheck, build). This repo is **docs-only now**, so there is no npm install/test yet.

## Useful Codex workflow
- Ask Codex to use the phase planning skill, then write scenarios, then implement small tasks, then run independent review.
- If skill detection fails, refer to explicit path, e.g. .agents/skills/create-planning-doc/SKILL.md.
- Do not grant automatic unrestricted network/deployment/secret access.
- Push reviewed commits to GitHub; Vercel deployment is a separate later decision.

## Sources
https://developers.openai.com/codex/skills and https://code.visualstudio.com/docs/agent-customization/agent-skills ; use official current extension documentation because commands/UI change.
