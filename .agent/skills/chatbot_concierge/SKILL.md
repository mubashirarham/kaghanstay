---
name: Chatbot Concierge Management
description: Skill for secure, cost-controlled management of the Groq LLM chatbot integration.
---

# Chatbot Concierge Management

This skill covers the integration, security, and optimization of the chatbot concierge service.

## Security & Reliability Guidelines

### 1. Guarding destructive tool calls
* The chatbot concierge has access to functions like booking rooms. These operations must not write directly to the database without authentication and server-side validation.
* Route LLM actions through the official, verified booking creation server endpoint.

### 2. Preventing TOCTOU (Time-of-Check to Time-of-Use) Double Booking
* When the LLM checks room availability and then proceeds to book, there is a risk of another transaction booking the same room in between.
* Implement availability-checks and booking writes inside a single Firestore transaction using the Admin SDK.

### 3. Cost-Abuse and Loop Control
* Cap LLM invocation tool-call loops (`maxLoops`) to prevent runaway costs or infinite loops.
* Enforce authentication and robust rate-limiting for the chatbot API route.
* Set tight token ceilings and monitor usages.
* Do not keep fallback-secret patterns in the code; fail closed if `process.env.GROQ_API_KEY` is not present.
