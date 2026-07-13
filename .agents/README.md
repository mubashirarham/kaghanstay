# Kaghan Stay Agent Customizations

This folder contains customized rules and skills for the coding agent (e.g., Antigravity) running on the Kaghan Stay project workspace.

## Structure

* [AGENTS.md](file:///d:/Kaghan%20Stay/.agents/AGENTS.md) - Project-scoped guidelines and security policies.
* [memory.md](file:///d:/Kaghan%20Stay/.agents/memory.md) - Continuous memory log tracking task history and decisions.
* `skills/` - Custom skill directories containing specialized instructions.
  * [security_remediation/SKILL.md](file:///d:/Kaghan%20Stay/.agents/skills/security_remediation/SKILL.md) - Systematic security remediation loop.
  * [firebase_admin/SKILL.md](file:///d:/Kaghan%20Stay/.agents/skills/firebase_admin/SKILL.md) - Integration guidelines for Firebase Admin SDK and rules.
  * [secure_coding/SKILL.md](file:///d:/Kaghan%20Stay/.agents/skills/secure_coding/SKILL.md) - Sanitization, CORS, and CSP guidelines.
  * [chatbot_concierge/SKILL.md](file:///d:/Kaghan%20Stay/.agents/skills/chatbot_concierge/SKILL.md) - Secure management of LLM tools & TOCTOU prevention.
  * [input_validation/SKILL.md](file:///d:/Kaghan%20Stay/.agents/skills/input_validation/SKILL.md) - Schema validation using Zod and API integrity.

These skills are automatically detected and loaded by the environment.
