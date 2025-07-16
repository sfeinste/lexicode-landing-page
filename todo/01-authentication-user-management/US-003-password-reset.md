# US-003: Password Reset

## User Story
As a user who has forgotten my password, I want to reset it securely so that I can regain access to my Lexicode account.

## Acceptance Criteria
- [ ] User can access password reset from login page
- [ ] Password reset form requires only email address
- [ ] User receives password reset email within 5 minutes
- [ ] Reset link in email is valid for 1 hour
- [ ] Reset link can only be used once
- [ ] Password reset page shows email partially masked for privacy
- [ ] New password must meet same requirements as registration
- [ ] User cannot reuse last 5 passwords
- [ ] Successful reset shows confirmation and redirects to login
- [ ] All active sessions are invalidated after password reset
- [ ] User receives confirmation email after successful reset

## Technical Requirements
- Frontend:
  - Password reset request form
  - Password reset form (accessed via email link)
  - Token validation on reset page load
  - Password strength validation
  - Success/error messaging
- Backend:
  - POST /api/auth/forgot-password endpoint
  - POST /api/auth/reset-password endpoint
  - Secure token generation and storage
  - Token expiration logic
  - Password history tracking
  - Session invalidation mechanism
- Security:
  - Rate limiting on reset request endpoint
  - Secure random token generation
  - One-time use token enforcement
  - Email verification before sending reset link

## Design Notes
- Clear instructions at each step
- Progress indicator for multi-step process
- Reassuring messaging about account security
- Mobile-responsive forms
- Clear error states for expired/invalid tokens
- Success state should be clearly distinguishable

## Dependencies
- Email service for sending reset links
- Secure token generation library
- Password history storage
- Session management for invalidation