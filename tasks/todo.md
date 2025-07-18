# Multi-Page Documentation Implementation Plan

## Overview
Transform the documentation generation from a single markdown page to multiple pages (one per file) with a file browser UI similar to browsing a codebase.

## Phase 1: Backend - Database & Models
- [ ] Update database schema to properly use the `documentation_files` table
- [ ] Create/update TypeScript interfaces for file-based documentation
- [ ] Add migration to ensure `documentation_files` table has proper constraints and indexes

## Phase 2: Backend - Documentation Generation Service
- [ ] Modify `generateDocumentation()` to generate documentation per file instead of single blob
- [ ] Create `generateFileDocumentation()` method to process individual files
- [ ] Update chunking logic to work with file-based generation
- [ ] Store individual file documentation in `documentation_files` table
- [ ] Create summary/index documentation for the repository overview

## Phase 3: Backend - API Endpoints
- [ ] Implement `GET /api/v1/documentation/:repositoryId/files` - list all documentation files
- [ ] Implement `GET /api/v1/documentation/:repositoryId/files/:filePath` - get specific file documentation
- [ ] Update existing endpoints to support both legacy single-page and new multi-page format
- [ ] Add endpoint for repository overview/summary documentation

## Phase 4: Frontend - Data Models & API Integration
- [ ] Create TypeScript interfaces for file-based documentation
- [ ] Add API service methods for fetching file list and individual files
- [ ] Update existing documentation fetching to handle new structure

## Phase 5: Frontend - File Browser Component
- [ ] Create `FileTree` component for displaying repository file structure
- [ ] Implement collapsible folders with icons
- [ ] Add file type icons and syntax highlighting indicators
- [ ] Implement search/filter functionality within file tree

## Phase 6: Frontend - Documentation Viewer Updates
- [ ] Create new `MultiPageDocumentationView` component
- [ ] Split screen layout: file browser on left, documentation on right
- [ ] Add navigation between files (previous/next)
- [ ] Update `DocumentationViewPage` to use new multi-page viewer
- [ ] Add breadcrumb navigation showing current file path

## Phase 7: Frontend - UI/UX Enhancements
- [x] Add loading states for file tree and individual files
- [x] Implement keyboard navigation (arrow keys for file tree)
- [x] Add download options (single file or entire documentation)
- [x] Mobile responsive design with collapsible sidebar

## Phase 8: Testing & Migration
- [ ] Test documentation generation with various repository sizes
- [ ] Add backward compatibility for existing single-page documentation
- [ ] Create migration strategy for existing documentation
- [ ] Performance testing for large repositories

## Implementation Notes
- Keep changes simple and focused on one area at a time
- Ensure backward compatibility during transition
- Use existing database schema where possible
- Leverage existing UI components and patterns
- Test each phase before moving to the next

## Review Section
*To be completed after implementation*