# Async Queue Implementation Todo List

## Completed Tasks

### Backend Infrastructure
- [x] Analyze current backend structure and documentation flow
- [x] Create docker-compose.yml with RabbitMQ service
- [x] Install RabbitMQ client dependencies (amqplib)
- [x] Create queue service for managing RabbitMQ connections
- [x] Refactor repository documentation endpoint to use queue
- [x] Create background worker for processing documentation jobs
- [x] Add progress tracking mechanism using Redis
- [x] Create progress endpoint for frontend to poll
- [x] Create worker startup script
- [x] Update package.json with worker scripts

## Pending Tasks

### Frontend Updates
- [ ] Update frontend to handle async responses and show progress
  - [ ] Modify API calls to handle 202 response with jobId
  - [ ] Implement polling mechanism for progress updates
  - [ ] Create progress UI component
  - [ ] Handle completion and error states

### Testing
- [ ] Test the complete async flow
  - [ ] Start docker-compose services
  - [ ] Run backend server and worker
  - [ ] Test documentation generation
  - [ ] Verify progress updates

## Review

### Summary of Changes

The backend has been successfully refactored from a synchronous to an asynchronous architecture using RabbitMQ for job queuing and Redis for progress tracking.

### Key Components Added:

1. **Docker Compose Setup**
   - Added RabbitMQ service for message queuing
   - Added Redis service for progress tracking
   - Both services configured with health checks

2. **Queue Service (`queueService.ts`)**
   - Manages RabbitMQ connections
   - Publishes documentation jobs to queue
   - Handles job consumption
   - Publishes progress updates

3. **Documentation Worker (`documentationWorker.ts`)**
   - Processes documentation jobs from queue
   - Tracks progress in Redis
   - Handles both regular and file-based documentation
   - Graceful shutdown support

4. **API Changes**
   - Documentation generation endpoints now return 202 Accepted with jobId
   - Added `/api/v1/documentation/progress/:jobId` endpoint
   - Queue integration in documentation controller

5. **Infrastructure Updates**
   - Server initializes queue service on startup
   - Added npm scripts for running worker
   - Added concurrently for parallel development

### Architecture Benefits:
- Frontend no longer blocks during documentation generation
- Better scalability - can run multiple workers
- Progress visibility for users
- Resilient to failures with message persistence
- Separation of concerns between API and processing

### Next Steps:
1. Frontend needs to be updated to handle async flow
2. Testing of the complete system
3. Consider adding more detailed progress tracking (per-file progress)
4. Add monitoring and error recovery mechanisms

---

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

### File-Based Async Documentation Generation

#### Summary of Changes

1. **Increased Anthropic Service Backoff**
   - Updated max backoff from 60 seconds to 600 seconds (10 minutes) for 529 errors
   - File: `app/backend/src/services/anthropic.service.ts:42`

2. **Added File Processing Queue**
   - Created new `file_documentation_jobs` queue in RabbitMQ
   - Added `FileDocumentationJob` interface
   - Added methods to publish and consume file documentation jobs
   - File: `app/backend/src/services/queueService.ts`

3. **Updated Documentation Service**
   - Modified `generateFileBasedDocumentation` to queue individual file jobs instead of processing synchronously
   - Added jobId parameter to track job across workers
   - Returns partial result immediately while files process asynchronously
   - File: `app/backend/src/modules/documentation/services/documentation-service.ts:262`

4. **Created File Documentation Worker**
   - New worker processes individual file documentation jobs
   - Fetches file content from GitHub
   - Generates documentation using existing FileDocumentationService
   - Updates progress in Redis and publishes to RabbitMQ
   - Generates final repository summary when all files are processed
   - File: `app/backend/src/workers/fileDocumentationWorker.ts`

5. **Updated Worker Scripts**
   - Added `dev:file-worker` and `start:file-worker` scripts
   - Updated `dev:all` to include the file worker
   - File: `app/backend/package.json:9-10`

6. **Fixed Documentation Worker**
   - Updated to pass jobId to documentation service
   - File: `app/backend/src/workers/documentationWorker.ts:135`

#### Architecture Benefits

- **Scalability**: Individual files can be processed in parallel by multiple worker instances
- **Resilience**: If a single file fails, it doesn't affect the entire job
- **Progress Tracking**: Better granular progress updates as each file completes
- **Resource Management**: Better control over rate limiting and resource usage
- **Flexibility**: Can prioritize certain files or restart failed file processing

#### Key Implementation Details

- Files are queued individually with metadata (path, name, extension) rather than full content
- Worker fetches file content on-demand to reduce queue message size
- Progress is tracked both in Redis (for real-time updates) and database
- Summary generation happens after all files are processed
- Maintains backward compatibility with existing API

#### Running the System

To run the new architecture:
1. Start Docker services: `docker-compose up -d`
2. Run all services: `npm run dev:all`
3. The system now includes:
   - Main API server
   - Documentation worker (handles job creation)
   - File documentation worker (processes individual files)

Documentation generation now happens asynchronously with improved scalability and resilience.

---

# Claude Code SDK Documentation Generation Implementation Plan

## Overview
Implement a new documentation generation service using the Claude Code SDK that clones repositories locally and generates documentation for the entire codebase at once, as an alternative to the current file-by-file queue-based approach.

## TODO Items

- [x] Install Claude Code SDK dependency and required packages for git cloning
- [x] Create ClaudeCodeDocumentationService in app/backend/src/services
- [x] Add repository cloning functionality with temporary directory management
- [x] Implement Claude Code SDK integration for documentation generation
- [x] Create configuration option to choose between file-by-file and Claude Code SDK approaches
- [x] Update API endpoint to support new documentation generation method
- [ ] Test the new service with a sample repository
- [x] Update documentation generation worker to support both methods

## Implementation Details

### Current Architecture
- **Queue-based**: Uses RabbitMQ to process files one by one
- **GitHub API**: Fetches files via GitHub API (no cloning)
- **Anthropic SDK**: Uses standard Anthropic SDK for AI generation
- **Storage**: Saves markdown documentation in Supabase tables

### New Claude Code SDK Approach
- **Local cloning**: Clone entire repository to temp directory
- **Claude Code SDK**: Use SDK to analyze entire codebase at once
- **Same storage**: Store results in same Supabase tables for consistency
- **Option-based**: Users can choose between approaches

### Key Changes Needed
1. Add git cloning capability (likely using `simple-git` package)
2. Implement temp directory management for cloned repos
3. Create new service class for Claude Code SDK integration
4. Modify existing flow to support method selection
5. Ensure proper cleanup of temp directories

## Notes
- Keep changes minimal and simple as per project guidelines
- Maintain compatibility with existing database schema
- Test thoroughly before full integration

## Review

### Summary of Changes

Successfully integrated Claude Code SDK as an alternative documentation generation method alongside the existing file-by-file approach.

### Key Components Added:

1. **Dependencies**
   - Added `@anthropic-ai/claude-code` (v1.0.59) - Claude Code SDK package
   - Added `simple-git` (v3.28.0) - For cloning repositories
   - Added `tmp` (v0.2.3) - For temporary directory management
   - Added `@types/tmp` - TypeScript types

2. **ClaudeCodeDocumentationService (`claude-code-documentation.service.ts`)**
   - Clones repositories to temporary directory using GitHub App authentication
   - Uses Claude Code SDK to analyze entire codebase at once
   - Properly cleans up temporary directories after use
   - Returns documentation in same format as existing services

3. **API Endpoint Updates**
   - New route: `POST /api/v1/documentation/generate/:repositoryId/advanced`
   - Accepts `method` parameter in request body: `'claude-code'` or `'file-by-file'`
   - Defaults to `'file-by-file'` for backward compatibility

4. **Documentation Service Updates**
   - Added `generateClaudeCodeDocumentation()` method
   - Integrated with existing database schema (no changes needed)
   - Stores results in same tables as file-by-file approach

5. **Worker Updates**
   - Documentation worker now checks job method and routes to appropriate service
   - Supports both generation methods seamlessly

### Architecture Highlights:
- **Authentication**: Uses same GitHub App installation tokens as existing code
- **Database**: No schema changes required - uses existing tables
- **Backward Compatible**: Existing endpoints and functionality unchanged
- **Clean Implementation**: Minimal changes to existing code
- **Resource Management**: Proper cleanup of cloned repositories

### Usage:
To use the new Claude Code SDK method, make a POST request to:
```
POST /api/v1/documentation/generate/{repositoryId}/advanced
{
  "method": "claude-code"
}
```

The system will clone the repository, analyze it with Claude Code SDK, and store the documentation in the database.