---
name: Security Remediation
description: A skill to guide the remediation of security issues in the Kaghan Stay project.
---

# Security Remediation Skill

This skill guides the agent in systematically resolving the security findings in Kaghan Stay.

## Procedures

### 1. Security Loop Execution
Follow the security loop state machine:
1. **LOAD:** Read `fixing.md` to identify remaining security vulnerabilities.
2. **SELECT:** Choose the highest severity vulnerability that is not yet remediated.
3. **FIX:** Apply remediation according to the suggested fix.
4. **VERIFY:** Validate that the fix is correct, functional, and does not break existing application behavior.
5. **CHANGELOG:** Update a security changelog when a vulnerability is successfully verified.

### 2. Code Auditing
When modifying any file:
* Audit surrounding code for similar patterns (e.g., other `innerHTML` references, open CORS headers, missing token validations).
* Double check that no API key or credential is accidentally committed to Git.
* Check that all dependencies added are secure and audited.
