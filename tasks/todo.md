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
(To be filled after implementation)