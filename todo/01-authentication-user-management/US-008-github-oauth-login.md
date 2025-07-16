# US-008: GitHub OAuth Login

## User Story
As a developer, I want to log in using my GitHub account so that I can quickly access Lexicode and automatically connect my repositories.

## Acceptance Criteria
- [ ] "Login with GitHub" button on login and registration pages
- [ ] Clicking button redirects to GitHub authorization
- [ ] User can approve requested permissions:
  - Read user profile
  - Read user email
  - Read repository list
- [ ] After authorization, user returns to Lexicode
- [ ] New users automatically create account with GitHub info
- [ ] Existing users can link GitHub to their account
- [ ] GitHub email matches existing account prompts to link
- [ ] User can unlink GitHub account from settings
- [ ] Repository permissions requested separately (not during login)
- [ ] Clear explanation of what data is accessed
- [ ] Handle GitHub OAuth errors gracefully

## Technical Requirements
- Frontend:
  - GitHub login button component
  - OAuth callback handler page
  - Loading state during OAuth flow
  - Error handling for OAuth failures
  - Account linking flow UI
- Backend:
  - GET /api/auth/github endpoint
  - GET /api/auth/github/callback endpoint
  - GitHub OAuth app configuration
  - User account creation/linking logic
  - Token storage for GitHub API access
- Security:
  - State parameter for CSRF protection
  - Secure token exchange
  - Minimal permission scope
  - Token encryption in database
  - OAuth error handling

## Design Notes
- GitHub button follows brand guidelines
- Clear permission explanation screen
- Smooth transition during OAuth flow
- Loading state during callback processing
- Success message after linking
- Mobile-friendly OAuth flow
- Clear unlink confirmation

## Dependencies
- GitHub OAuth App registration
- OAuth2 client library
- GitHub API client
- Account linking system
- Secure token storage