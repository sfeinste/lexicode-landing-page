# US-007: Session Management

## User Story
As a security-conscious user, I want to manage my active sessions so that I can monitor account access and revoke sessions from devices I no longer use.

## Acceptance Criteria
- [ ] User can view all active sessions
- [ ] Session information includes:
  - Device type and browser
  - IP address and approximate location
  - Login timestamp
  - Last activity timestamp
  - Current session indicator
- [ ] User can revoke individual sessions
- [ ] User can revoke all sessions except current
- [ ] Revoking session immediately logs out that device
- [ ] Sessions expire after 30 days of inactivity
- [ ] "Remember me" sessions shown differently
- [ ] Suspicious activity alerts for new locations
- [ ] Session activity log shows last 10 actions
- [ ] Mobile app sessions tracked separately

## Technical Requirements
- Frontend:
  - Sessions list with device icons
  - Geolocation display for IP addresses
  - Revoke buttons with confirmations
  - Real-time updates when sessions change
  - Current session highlighting
- Backend:
  - GET /api/auth/sessions endpoint
  - DELETE /api/auth/sessions/:id endpoint
  - Session tracking in database
  - Device fingerprinting
  - IP geolocation service
  - Real-time session invalidation
- Security:
  - Secure session token storage
  - Device fingerprinting for detection
  - Anomaly detection for locations
  - Immediate propagation of revocations

## Design Notes
- Clean list view with device icons
- Clear visual distinction for current session
- Location shown as "City, Country"
- Confirmation modal for bulk revoke
- Mobile-responsive session cards
- Activity timeline visualization
- Clear security messaging

## Dependencies
- Device detection library
- IP geolocation service
- Session storage system
- Real-time messaging for invalidation
- Device fingerprinting library