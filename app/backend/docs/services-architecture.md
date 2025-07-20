# Core Services Architecture

## Overview

The backend includes a comprehensive set of services for code analysis, documentation generation, and external integrations. Services follow consistent patterns for error handling, rate limiting, and retry logic.

## LLM Services

### OpenAI Service
Primary LLM provider for documentation generation.

**Key Features:**
- Rate limiting with exponential backoff
- Request queuing to prevent concurrent calls
- Token-based cost tracking
- Configurable model selection (GPT-4, GPT-3.5)

**Interface:**
```typescript
interface OpenAIServiceOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
}

generateDocumentation(
  prompt: string, 
  options?: OpenAIServiceOptions
): Promise<{
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
}>
```

### Anthropic Service
Alternative LLM provider (currently secondary).

**Key Features:**
- Similar interface to OpenAI service
- Claude model support
- Rate limiting and retry logic
- Cost tracking

## Code Analysis Services

### Code Chunking Service
Intelligently groups files for optimal LLM processing.

**Strategies:**
1. **Smart Chunking**: Groups by dependencies and modules
2. **Size-based Chunking**: Respects token limits
3. **Priority Chunking**: Important files first

**Key Methods:**
```typescript
smartChunkFiles(files: RepositoryFile[], options?: {
  maxTokensPerChunk?: number;
  maxFilesPerChunk?: number;
  priorityPatterns?: string[];
}): FileChunk[]

chunkFiles(files: RepositoryFile[], options?: ChunkOptions): FileChunk[]
```

### Code Context Extraction Service
Extracts rich metadata from source code.

**Extracts:**
- Type definitions (interfaces, classes, enums)
- Documentation comments (JSDoc, docstrings)
- Design patterns (Singleton, Factory, etc.)
- Environment variables
- Test examples
- Configuration schemas

**Interface:**
```typescript
interface ExtractedContext {
  types: TypeDefinition[];
  documentation: DocComment[];
  patterns: DesignPattern[];
  dependencies: Dependency[];
  configuration: ConfigSchema[];
  tests: TestExample[];
  environment: EnvVariable[];
}

extractContext(
  files: RepositoryFile[]
): Promise<ExtractedContext>
```

### File Analysis Service
Builds dependency graphs and analyzes code structure.

**Features:**
- Dependency graph construction
- Module boundary detection
- Complexity scoring
- File prioritization

**Key Types:**
```typescript
interface FileNode {
  path: string;
  type: 'component' | 'service' | 'util' | 'test' | 'config';
  imports: string[];
  exports: string[];
  complexity: number;
  priority: number;
  metadata: Record<string, any>;
}

interface DependencyGraph {
  nodes: Map<string, FileNode>;
  edges: Map<string, Set<string>>;
  modules: Map<string, string[]>;
  entryPoints: string[];
}
```

## Documentation Services

### File Documentation Service
Generates documentation for individual files.

**Process:**
1. Extract file metadata
2. Analyze code structure
3. Generate contextual prompt
4. Call LLM for documentation
5. Format and validate output

**Interface:**
```typescript
generateFileDocumentation(params: {
  file: RepositoryFile;
  repositoryContext: RepositoryContext;
  projectType?: string;
  onProgress?: (progress: number, message: string) => void;
}): Promise<FileDocumentationResult>
```

### Multi-Pass Generation Service
Comprehensive documentation through multiple passes.

**Three-Pass Strategy:**
1. **Overview Pass**: Architecture, design decisions, patterns
2. **API Pass**: Detailed API documentation, types, interfaces
3. **Usage Pass**: Examples, tutorials, integration guides

**Benefits:**
- Cross-referenced documentation
- Comprehensive coverage
- Progressive enhancement

## Integration Services

### GitHub File Reader Service
Fetches and processes repository files.

**Features:**
- Smart file filtering (excludes build artifacts, etc.)
- Batch content retrieval
- Configuration file analysis
- Dependency extraction

**Key Methods:**
```typescript
fetchRepositoryFiles(params: {
  owner: string;
  repo: string;
  installationToken: string;
  branch?: string;
}): Promise<{
  files: RepositoryFile[];
  readme?: string;
  packageJson?: any;
  configuration: ConfigFile[];
  dependencies: DependencyInfo;
}>
```

### Queue Service
RabbitMQ integration for async processing.

**Features:**
- Job prioritization
- Progress tracking
- Dead letter queue
- Connection pooling

**Interface:**
```typescript
interface QueueService {
  publishDocumentationJob(job: DocumentationJob): Promise<void>
  publishProgress(jobId: string, progress: JobProgress): Promise<void>
  consumeDocumentationJobs(handler: JobHandler): Promise<void>
  close(): Promise<void>
}
```

## Prompt Templates Service
Sophisticated prompt generation system.

**Features:**
- Project type detection
- Framework-specific instructions
- Quality requirements
- Section templates

**Project Types:**
- API/Backend services
- Frontend applications
- CLI tools
- Libraries/Packages
- Full-stack applications

**Key Methods:**
```typescript
getMainPrompt(params: {
  projectType: string;
  files: RepositoryFile[];
  enhancedContext?: ExtractedContext;
}): string

getFilePrompt(params: {
  file: RepositoryFile;
  projectContext: ProjectContext;
}): string

detectProjectType(files: RepositoryFile[]): string
```

## Service Patterns

### Error Handling
```typescript
class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
  }
}
```

### Rate Limiting
```typescript
interface RateLimiter {
  acquire(): Promise<void>;
  release(): void;
  reset(): void;
}
```

### Retry Logic
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    backoffMs: number;
    maxBackoffMs: number;
  }
): Promise<T>
```

## Performance Considerations

- **Token Optimization**: Smart chunking minimizes API calls
- **Caching**: Redis caching for GitHub API responses
- **Batch Processing**: Reduces overhead for multiple files
- **Connection Pooling**: Reuses HTTP connections
- **Progress Streaming**: Real-time updates without polling