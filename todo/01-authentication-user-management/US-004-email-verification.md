# US-004: Email Verification

## User Story
As a newly registered user, I want to verify my email address so that I can activate my account and ensure secure communication with Lexicode.

## Acceptance Criteria
- [ ] User receives verification email immediately after registration
- [ ] Verification email contains clear call-to-action button
- [ ] Verification link is valid for 24 hours
- [ ] Clicking verification link confirms email and activates account
- [ ] User can request new verification email if original expires
- [ ] Maximum 3 verification email requests per hour
- [ ] Verified users see confirmation page with next steps
- [ ] Unverified users have limited access (can't connect repositories)
- [ ] Email verification status is shown in user profile
- [ ] Deep link handling for mobile email clients

## Technical Requirements
- Frontend:
  - Email verification landing page
  - Resend verification email button
  - Verification status indicator in UI
  - Limited access messaging for unverified users
  - Success/error states
- Backend:
  - GET /api/auth/verify-email endpoint
  - POST /api/auth/resend-verification endpoint
  - Token validation and expiration logic
  - Update user verification status
  - Rate limiting for resend requests
- Security:
  - Secure token generation
  - Token should include user ID and timestamp
  - Prevent token reuse after verification
  - Rate limiting on verification endpoints

## Design Notes
- Verification email should match brand design
- Clear instructions in email body
- Prominent CTA button in email
- Success page should guide user to next steps
- Mobile-optimized email template
- Fallback text link if button doesn't work

## Dependencies
- Email service with HTML template support
- Token generation and validation system
- User status management in database
- Email template system