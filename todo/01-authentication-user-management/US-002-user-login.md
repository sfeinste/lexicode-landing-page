# US-002: User Login

## User Story
As a registered user, I want to log in to my Lexicode account so that I can access my documentation dashboard and manage my repositories.

## Acceptance Criteria
- [ ] User can access login form from landing page header
- [ ] Login form includes fields for:
  - Email address
  - Password
  - "Remember me" checkbox
- [ ] User can log in with correct email and password
- [ ] Failed login attempts show appropriate error messages
- [ ] "Forgot password?" link is prominently displayed
- [ ] After 5 failed attempts, account is temporarily locked (15 minutes)
- [ ] Successful login redirects to user dashboard
- [ ] "Remember me" keeps user logged in for 30 days
- [ ] User can log in using GitHub OAuth (see US-008)
- [ ] Login form is accessible via keyboard navigation

## Technical Requirements
- Frontend:
  - React form with controlled components
  - Form validation before submission
  - Loading states during authentication
  - Secure token storage (httpOnly cookies preferred)
  - Redirect logic based on authentication state
- Backend:
  - POST /api/auth/login endpoint
  - JWT token generation with appropriate expiry
  - Refresh token mechanism
  - Failed attempt tracking in database
  - Account lockout logic
- Security:
  - Rate limiting on login endpoint
  - Secure password comparison using bcrypt
  - HTTPS only for authentication
  - CSRF protection

## Design Notes
- Login form should be simple and focused
- Clear visual distinction between login and registration CTAs
- Error messages should be helpful but not reveal too much information
- Loading state should prevent multiple submissions
- Social login options should be visually prominent
- Mobile-friendly with proper input types

## Dependencies
- JWT library for token generation
- Session management system
- Rate limiting middleware
- Account lockout mechanism