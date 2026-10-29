# RRS-F-004 password reset: classroom API simulation

This ticket implements backend endpoints only. No email service is connected and no email is sent. A known account's reset request logs a link to the local server console, as specified in the execution plan. This is a documented deviation from the SRS emailed-link flow and must be explained in the demo.

The printed `http://localhost:5173/reset-password?token=...` link carries the token, but this project currently has no reset-password frontend form. Complete the reset using the API, not by claiming that clicking the link finishes the UI flow. Do not expose these server logs publicly; reset links are temporary credentials.

## Local walkthrough with disposable data

1. Start the backend with a configured JWT_SECRET and initialized disposable SQLite database.
2. Register a test account via POST /auth/register.
3. POST /auth/request-password-reset with its email. Both known and unknown accounts receive the same200 response; tokens are never returned in JSON.
4. Read the locally logged reset link and use its token in POST /auth/reset-password with a new password.
5. The reset returns200; login with the new password returns200 and the old one returns401.
6. Tampering with the token or using one past its15-minute expiry returns400. A normal session JWT also returns400.

Automated checks: `cd backend && DATABASE_PATH=:memory: npx jest --runInBand --runTestsByPath test/auth.test.js`. The test captures the actual console-generated reset token and exercises the API through Supertest. It verifies hash replacement, login old/new password behavior,15-minute expiry claim, invalid tokens, account non-disclosure response, password limits and missing-secret behavior.

## Limits

- A reset JWT is stateless and can be reused until expiry. No one-time token store or invalidation is implemented by this plan.
- Existing session JWTs are not revoked by a password change.
- The generic response hides account existence in its body/status, not through constant-time/rate-limited behavior. Rate limits, real email delivery and deployment HTTPS are not provided here.
- This flow is for the classroom demo, not production account recovery.
