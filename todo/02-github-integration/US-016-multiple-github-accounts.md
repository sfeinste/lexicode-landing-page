# User Story: Multiple GitHub Accounts

## User Story
As a user with multiple GitHub accounts (personal and work), I want to connect and manage multiple GitHub accounts in Lexicode so that I can work with repositories from different accounts without constantly reconnecting.

## Acceptance Criteria
- [ ] Add multiple GitHub accounts
- [ ] Switch between connected accounts
- [ ] See which account owns each repository
- [ ] Account-specific settings and permissions
- [ ] Default account selection
- [ ] Account nicknames/labels (work, personal)
- [ ] Separate webhook configurations per account
- [ ] Account-specific API rate limit tracking

## Technical Requirements
- Multi-account OAuth token management
- Account switching context
- Separate token storage per account
- Account-aware API client
- Rate limit tracking per account
- Account isolation for security

## Design Notes
- Account switcher dropdown in header
- Account list in settings
- Add account button
- Account cards with avatar and label
- Active account indicator
- Quick switch menu
- Account color coding
- Repository list filtered by account

## Dependencies
- GitHub account connection (US-009)
- Enhanced token management system
- Account context system
- UI framework for account switching