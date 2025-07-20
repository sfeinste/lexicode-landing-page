# Documentation Module Documentation

## Overview

The Documentation module handles the generation, storage, and retrieval of AI-generated code documentation. It uses asynchronous processing with RabbitMQ and real-time progress tracking via Redis.

## Architecture

### Controllers

#### DocumentationController
Manages documentation generation and retrieval.

**Endpoints:**
- `POST /documentation/generate/:repositoryId` - Trigger async generation
- `GET /documentation/:repositoryId` - Get repository documentation
- `GET /documentation/` - Get all user documentation
- `GET /documentation/progress/:jobId` - Track generation progress
- `GET /documentation/:repositoryId/files` - List documented files
- `GET /documentation/:repositoryId/files/*` - Get specific file doc
- `GET /documentation/:repositoryId/summary` - Get repository summary

**Key Features:**
- Returns 202 Accepted for async operations
- Real-time progress tracking via Redis
- Supports file-based documentation generation
- Creates placeholder documentation for better UX

### Services

#### DocumentationService
Core service for documentation operations.

**Key Methods:**
```typescript
generateFileBasedDocumentation(params: {
  repositoryId: number;
  repositoryName: string;
  installationId: number;
  userId: string;
  jobId: string;
  onProgress?: (progress: number, message: string) => void;
}): Promise<void>

getDocumentation(repositoryId: number, userId: string): Promise<Documentation>

getFileDocumentation(repositoryId: number, userId: string): Promise<DocumentationFile[]>

getDocumentationSummary(repositoryId: number, userId: string): Promise<DocumentationSummary>
```

**Generation Process:**
1. Creates placeholder documentation immediately
2. Fetches repository files from GitHub
3. Processes files individually with progress callbacks
4. Generates documentation using OpenAI
5. Creates repository summary after all files
6. Updates database with final results

### Integration Services

#### FileDocumentationService
Generates documentation for individual files.

**Key Methods:**
```typescript
generateFileDocumentation(params: {
  file: RepositoryFile;
  repositoryContext: RepositoryContext;
  projectType?: string;
  onProgress?: ProgressCallback;
}): Promise<FileDocumentationResult>

generateBatchDocumentation(params: {
  files: RepositoryFile[];
  repositoryContext: RepositoryContext;
  batchSize?: number;
  onProgress?: ProgressCallback;
}): Promise<FileDocumentationResult[]>

generateRepositorySummary(params: {
  fileDocumentations: FileDocumentationResult[];
  repositoryContext: RepositoryContext;
}): Promise<DocumentationSummary>
```

#### Multi-Pass Generation Service
Three-pass documentation for comprehensive coverage.

**Passes:**
1. **Overview Pass**: Architecture and high-level concepts
2. **API Pass**: Detailed API documentation
3. **Usage Pass**: Examples and integration guides

**Key Methods:**
```typescript
generateDocumentation(params: {
  repositoryFiles: RepositoryFile[];
  repositoryContext: RepositoryContext;
  onProgress?: ProgressCallback;
}): Promise<MultiPassResult>
```

## Data Models

### Documentation
```typescript
interface Documentation {
  id: string;
  repositoryId: number;
  userId: string;
  content: string;
  version: number;
  generationId: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### DocumentationFile
```typescript
interface DocumentationFile {
  id: string;
  documentationId: string;
  filePath: string;
  content: string;
  summary: string;
  language?: string;
  fileType?: string;
  sizeBytes?: number;
  linesOfCode?: number;
  complexityScore?: number;
  metadata?: Record<string, any>;
}
```

### DocumentationGeneration
```typescript
interface DocumentationGeneration {
  id: string;
  repositoryId: number;
  userId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  triggerType: 'manual' | 'webhook' | 'scheduled';
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  inputData?: Record<string, any>;
  outputData?: Record<string, any>;
  metadata?: Record<string, any>;
}
```

### DocumentationSummary
```typescript
interface DocumentationSummary {
  id: string;
  documentationId: string;
  summaryType: 'overview' | 'technical' | 'architecture';
  content: string;
  keyFeatures?: string[];
  techStack?: TechStackInfo[];
  metadata?: Record<string, any>;
}
```

## Processing Flow

### File-Based Generation
1. **Initialization**
   - Create job in database
   - Set up progress tracking
   - Create placeholder documentation

2. **File Fetching**
   - Use GitHub App token
   - Filter relevant files
   - Extract configuration files

3. **Context Building**
   - Analyze dependencies
   - Extract project metadata
   - Determine project type

4. **Documentation Generation**
   - Process files individually
   - Use appropriate prompts
   - Track progress per file

5. **Summary Creation**
   - Aggregate file documentation
   - Generate repository overview
   - Extract key features

### Progress Tracking
```typescript
interface JobProgress {
  jobId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number; // 0-100
  currentFile?: string;
  message: string;
  filesProcessed: number;
  totalFiles: number;
  startedAt?: Date;
  estimatedCompletion?: Date;
}
```

## Queue Integration

### RabbitMQ Setup
- **Exchange**: `documentation` (topic)
- **Queue**: `documentation.generate`
- **Progress Topic**: `documentation.progress.{jobId}`

### Job Structure
```typescript
interface DocumentationJob {
  jobId: string;
  repositoryId: number;
  repositoryName: string;
  installationId: number;
  userId: string;
  priority: number;
  createdAt: Date;
}
```

## Error Handling

- **Retry Logic**: Failed file processing retried up to 3 times
- **Partial Success**: Documentation saved even if some files fail
- **Error Tracking**: Detailed error messages stored in database
- **User Notification**: Progress updates include error information

## Performance Optimizations

- **Batch Processing**: Files processed in configurable batches
- **Token Limits**: Smart chunking respects LLM token limits
- **Caching**: GitHub API responses cached in Redis
- **Parallel Processing**: Multiple workers can process different repositories
- **Progress Streaming**: Real-time updates via Redis pub/sub

## Integration Points

- **GitHub Service**: Repository file access
- **OpenAI Service**: Documentation generation
- **Queue Service**: Async job management
- **Redis**: Progress tracking and caching
- **Supabase**: Data persistence