# User Story: Select Repository & Branch

## User Story
As a user, I want to select a specific repository and branch to work with so that I can choose exactly which codebase and version I want to analyze or modify in Lexicode.

## Acceptance Criteria
- [ ] Select repository from browser interface
- [ ] Display all branches for selected repository
- [ ] Search/filter branches by name
- [ ] Show default branch prominently
- [ ] Display branch last commit info
- [ ] Allow switching between branches after selection
- [ ] Remember last selected branch per repository
- [ ] Show branch protection status

## Technical Requirements
- GitHub API integration for branch listing
- Branch metadata retrieval (last commit, author, date)
- Efficient branch switching mechanism
- Cache branch information appropriately
- Handle repositories with many branches
- Support for protected branches indication

## Design Notes
- Dropdown or modal for branch selection
- Default branch marked with badge
- Search input for branch filtering
- Show commit hash and date
- Visual indicator for protected branches
- Recently used branches section
- Branch comparison preview

## Dependencies
- Repository browser (US-010)
- GitHub API permissions
- Repository data model