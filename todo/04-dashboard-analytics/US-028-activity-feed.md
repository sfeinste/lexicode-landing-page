# US-028: Activity Feed

## User Story
As a **team member**, I want to **see a real-time feed of documentation activities** so that I can **stay informed about documentation changes and collaborate effectively**.

## Acceptance Criteria
- [ ] Shows real-time updates of documentation changes
- [ ] Displays AI-generated documentation events
- [ ] Includes manual documentation updates and reviews
- [ ] Allows filtering by repository, user, or activity type
- [ ] Provides activity summaries (daily/weekly digests)
- [ ] Supports commenting and reactions on activities
- [ ] Shows before/after previews for documentation changes
- [ ] Integrates with notification preferences

## Technical Requirements
- WebSocket for real-time updates
- Event streaming architecture
- Activity aggregation service
- Notification dispatch system
- Comment threading system
- Rich diff rendering
- Pagination for historical activities
- Search and filter API

## Design Notes
- Timeline-style feed layout
- Compact activity cards
- Expandable detail views
- User avatars and timestamps
- Activity type icons
- Inline diff previews
- Comment threads UI
- Filter sidebar

## Dependencies
- US-001: User authentication
- US-014: Review workflow
- US-025: Main dashboard
- External: WebSocket infrastructure
- External: Notification service