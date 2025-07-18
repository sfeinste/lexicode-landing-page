# Documentation Generation Implementation Plan

## Overview
Implement LLM documentation generation using Anthropic API for GitHub repositories. When a user clicks "Generate Docs" button on the repositories page, the system should:
1. Read source code files from the connected GitHub repository
2. Send code to Anthropic API for documentation generation
3. Save generated markdown documentation in Supabase
4. Display documentation on the documentation page

## Todo List

### Phase 1: Setup and Dependencies
- [ ] Install Anthropic SDK (`@anthropic-ai/sdk`) in backend
- [ ] Create Anthropic service wrapper for API integration
- [ ] Create centralized prompt management system
- [ ] Verify ANTHROPIC_API_KEY exists in .env

### Phase 2: Code Reading and Processing
- [ ] Create GitHub file reader service to fetch repository contents
- [ ] Implement file filtering (exclude non-code files, node_modules, etc.)
- [ ] Create code chunking strategy for large repositories
- [ ] Implement file content aggregation for API requests

### Phase 3: Documentation Generation Service
- [ ] Implement DocumentationService.generateDocumentation method
- [ ] Create API endpoint POST /api/v1/documentation/generate/:repositoryId
- [ ] Add progress tracking for long-running generation tasks
- [ ] Implement error handling and retry logic

### Phase 4: Storage and Retrieval
- [ ] Create Supabase schema for storing generated documentation
- [ ] Implement documentation storage service
- [ ] Create API endpoint GET /api/v1/documentation/:repositoryId
- [ ] Add documentation versioning support

### Phase 5: Frontend Integration
- [ ] Connect "Generate Docs" button to API endpoint
- [ ] Add loading states and progress indicators
- [ ] Implement error handling in UI
- [ ] Update documentation page to display generated content

### Phase 6: Testing and Polish
- [ ] Add unit tests for documentation service
- [ ] Test with various repository sizes and languages
- [ ] Add rate limiting for API calls
- [ ] Implement cost tracking/estimation

## Implementation Notes
- Keep everything in the backend monolith for now (as specified)
- Make the LLM prompt easily editable and iterable
- Focus on simplicity - avoid complex architectures initially
- Use existing module structure in backend/src/modules/documentation/

## Review Section

### Summary of Changes

Successfully implemented the LLM documentation generation feature using Anthropic's API. The implementation includes:

#### Backend Changes:
1. **Anthropic Integration**
   - Installed Anthropic SDK
   - Created `AnthropicService` wrapper with cost tracking
   - Implemented retry logic and error handling

2. **GitHub Integration**
   - Created `GitHubFileReaderService` to fetch repository files
   - Implemented smart file filtering (excludes node_modules, build files, etc.)
   - Added support for reading README and package.json

3. **Documentation Processing**
   - Created `CodeChunkingService` for handling large repositories
   - Implemented `PromptTemplates` for centralized prompt management
   - Updated `DocumentationService` with full generation logic

4. **API Endpoints**
   - POST `/api/v1/documentation/generate/:repositoryId` - Triggers documentation generation
   - GET `/api/v1/documentation/:repositoryId` - Retrieves generated documentation

5. **Database Schema**
   - Added `documentation` table for storing generated content
   - Added `documentation_generations` table for tracking generation history
   - Implemented proper RLS policies for security

#### Frontend Changes:
1. **Repositories Page**
   - Connected "Generate Docs" button to API
   - Added loading states and error handling
   - Implemented per-repository loading indicators

2. **Documentation View Page**
   - Created new page for viewing generated documentation
   - Added markdown rendering with GitHub-flavored markdown support
   - Implemented download and regenerate functionality

#### Key Features:
- Automatic code file detection and filtering
- Support for large repositories through chunking
- Cost tracking for API usage
- Real-time loading states
- Error handling and user feedback
- Markdown documentation export

#### Next Steps (Future Enhancements):
- Add progress tracking for long-running generations
- Implement documentation versioning
- Add webhook support for automatic regeneration
- Create documentation search functionality
- Add customizable generation templates