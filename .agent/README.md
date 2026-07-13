# Kaghan Stay Agent Customizations

This folder contains customized rules and skills for the coding agent (e.g., Antigravity) running on the Kaghan Stay project workspace.

## Structure

* [AGENTS.md](file:///d:/Kaghan%20Stay/.agent/AGENTS.md) - Project-scoped guidelines and security policies.
* [memory.md](file:///d:/Kaghan%20Stay/.agent/memory.md) - Continuous memory log tracking task history and decisions.
* `skills/` - Custom skill directories containing specialized instructions.
  * [security_remediation/SKILL.md](file:///d:/Kaghan%20Stay/.agent/skills/security_remediation/SKILL.md) - Systematic security remediation loop.
  * [firebase_admin/SKILL.md](file:///d:/Kaghan%20Stay/.agent/skills/firebase_admin/SKILL.md) - Integration guidelines for Firebase Admin SDK and rules.
  * [secure_coding/SKILL.md](file:///d:/Kaghan%20Stay/.agent/skills/secure_coding/SKILL.md) - Sanitization, CORS, and CSP guidelines.
  * [chatbot_concierge/SKILL.md](file:///d:/Kaghan%20Stay/.agent/skills/chatbot_concierge/SKILL.md) - Secure management of LLM tools & TOCTOU prevention.
  * [input_validation/SKILL.md](file:///d:/Kaghan%20Stay/.agent/skills/input_validation/SKILL.md) - Schema validation using Zod and API integrity.

Please note: The standard workspace customizations folder expected by the IDE environment is `.agents` (plural), which has also been created and populated identically.
