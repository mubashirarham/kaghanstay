---
name: Input Validation and Schema Enforcement
description: Skill for schema validation on APIs, preventing payload flooding and mail relay abuse.
---

# Input Validation and Schema Enforcement

This skill ensures that all entry points to Netlify Serverless Functions are properly validated.

## Key Principles

### 1. Using Zod for Input Validation
* Validate all request payloads using a schema parser (like Zod) before reading any attributes.
* Define schemas matching the exact expected shape:
  ```javascript
  const { z } = require('zod');
  
  const BookingSchema = z.object({
    roomId: z.string(),
    dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    guestInfo: z.object({
      name: z.string(),
      email: z.string().email(),
      phone: z.string()
    }),
    couponCode: z.string().optional()
  });
  ```

### 2. Guarding Email Relays
* Never accept dynamic HTML (`htmlBody`) directly from clients in email endpoints.
* Define static templates server-side and interpolate variables only after rigorous escaping.
* Limit array lengths (such as booking arrays) to reasonable caps to prevent memory leaks and mail sending loop exhaustion.
* Always enforce authentication validation on functions that trigger emails (newsletter, customer reminders, admin notifications).
