#!/usr/bin/env python3
"""Offline smoke-check for the docs-only Codex bootstrap. Standard library only."""
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    "README.md", "AGENTS.md", "docs/BUSINESS_RULES.md", "docs/ARCHITECTURE.md",
    "docs/DATA_MODEL.md", "docs/UX.md", "docs/ROADMAP.md",
    "docs/CODEX_WORKFLOW.md", "docs/AGENT_FACTORY.md",
    "docs/PRD.md", "docs/IMPLEMENTATION_PLAN.md", "docs/TASKS.md",
    "docs/OPEN_QUESTIONS.md", "docs/adr/0001-checkpoints-and-allocations.md",
    "tests/scenarios/phase-01/core-rules.md",
    "tests/scenarios/phase-01/hb-001-checkpoints-and-allocations.md",
    "docs/adr/0002-month-closing-and-corrections.md",
    "tests/scenarios/phase-01/hb-002-month-closing-and-corrections.md",
]
SKILLS = [
    "create-milestone", "create-planning-doc", "create-issues",
    "create-scenarios", "define-architecture", "define-conventions",
    "configure-project", "maintain-agent-instructions", "create-phase-overview",
    "verify-financial-invariants",
]
EXPECTED_LAYERS = {
    "domain", "features", "infrastructure", "app",
    "shared-pure", "shared-ui", "shared-i18n",
}
errors = []
for p in REQUIRED + [f".agents/skills/{name}/SKILL.md" for name in SKILLS]:
    if not (ROOT / p).is_file():
        errors.append(f"missing {p}")
for name in SKILLS:
    path = ROOT / f".agents/skills/{name}/SKILL.md"
    if path.exists():
        s = path.read_text(encoding="utf-8")
        if not s.startswith("---\n") or not re.search(r"(?m)^name:\s*"+re.escape(name)+r"\s*$", s) or not re.search(r"(?m)^description:\s*\S+",s):
            errors.append(f"invalid skill frontmatter: {name}")
try:
    architecture = json.loads((ROOT / "docs/architecture.json").read_text(encoding="utf-8"))
    layers = {x["name"] for x in architecture["layers"]}
    if layers != EXPECTED_LAYERS or len(architecture["layers"]) != len(EXPECTED_LAYERS):
        errors.append("unexpected architecture layers")
except (OSError, ValueError, KeyError) as exc:
    errors.append(f"invalid architecture.json: {exc}")

if errors:
    print("Doc bootstrap verification FAILED")
    print("\n".join(errors))
    sys.exit(1)
print(f"Bootstrap documentation OK: {len(REQUIRED)} core files, {len(SKILLS)} Codex skills, architecture JSON.")
