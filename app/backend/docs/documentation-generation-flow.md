# Documentation Generation Flow

This document illustrates the complete request flow and queueing patterns for fetching code from GitHub, analyzing it with LLMs, and storing results in the database.

## Architecture Overview

The system uses an asynchronous, queue-based architecture to handle long-running documentation generation tasks. This ensures the API remains responsive while processing potentially large repositories.

## Flow Diagram

```mermaid
graph TB
    %% User Interface Layer
    subgraph "Frontend"
        UI[User Interface]
    end

    %% API Layer
    subgraph "Backend API"
        Controller[Documentation Controller]
        AuthMW[Auth Middleware]
    end

    %% Queue Layer
    subgraph "Message Queue"
        RabbitMQ["RabbitMQ<br>documentation_jobs queue"]
        ProgressEx["Progress Exchange<br>progress_updates"]
    end

    %% Worker Layer
    subgraph "Background Worker"
        Worker[Documentation Worker]
        DocService[Documentation Service]
        FileDocService[File Documentation Service]
    end

    %% External Services
    subgraph "External Services"
        GitHub[GitHub API]
        OpenAI[OpenAI API]
        Anthropic["Anthropic API<br>(Secondary)"]
    end

    %% Storage Layer
    subgraph "Storage"
        PostgreSQL[("PostgreSQL<br>Supabase")]
        Redis[("Redis<br>Progress Cache")]
    end

    %% Request Flow
    UI -->| POST /documentation/generate/:repositoryId| AuthMW
    AuthMW -->| Validate JWT| Controller
    Controller -->| Create JobId| Controller
    Controller -->| Publish Job| RabbitMQ
    Controller -->|" Return 202 Accepted<br>with JobId"| UI

    %% Async Processing Flow
    RabbitMQ -->| Consume Job| Worker
    Worker -->| Update Progress: Processing| Redis
    Worker -->| Fetch Repository Info| PostgreSQL
    Worker -->| Call Service| DocService
    
    %% Documentation Generation
    DocService -->| Get GitHub Token| PostgreSQL
    DocService -->| Fetch Files| GitHub
    GitHub -->| Repository Files| DocService
    DocService -->| Process Files| FileDocService
    
    %% File Processing Loop
    FileDocService -->| For Each File| FileDocService
    FileDocService -->| Extract Context| FileDocService
    FileDocService -->| Generate Prompt| FileDocService
    FileDocService -->| Send to LLM| OpenAI
    OpenAI -->| Documentation| FileDocService
    FileDocService -->| Store Result| PostgreSQL
    FileDocService -->| Update Progress| Redis
    
    %% Progress Updates
    Worker -->| Monitor Progress| PostgreSQL
    Worker -->| Publish Updates| ProgressEx
    Redis -->| Cache Progress| Redis
    
    %% Completion
    FileDocService -->| Generate Summary| OpenAI
    FileDocService -->| Store Summary| PostgreSQL
    Worker -->| Update Status: Completed| Redis
    Worker -->| Final Progress| ProgressEx

    %% Progress Polling
    UI -->| GET /documentation/progress/:jobId| Controller
    Controller -->| Fetch Progress| Redis
    Redis -->| Progress Data| Controller
    Controller -->| Return Progress| UI

    %% Final Result
    UI -->| GET /documentation/:repositoryId| Controller
    Controller -->| Fetch Documentation| PostgreSQL
    PostgreSQL -->| Documentation Data| Controller
    Controller -->| Return Documentation| UI

    %% Styling
    classDef userInterface fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef api fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef queue fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef worker fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef external fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef storage fill:#f1f8e9,stroke:#33691e,stroke-width:2px
    
    class UI userInterface
    class Controller,AuthMW api
    class RabbitMQ,ProgressEx queue
    class Worker,DocService,FileDocService worker
    class GitHub,OpenAI,Anthropic external
    class PostgreSQL,Redis storage
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant API as API Controller
    participant Q as RabbitMQ
    participant W as Worker
    participant R as Redis
    participant DB as PostgreSQL
    participant GH as GitHub API
    participant LLM as OpenAI/Anthropic

    %% Initial Request
    U->>API: POST /documentation/generate/:repositoryId
    API->>DB: Validate repository access
    DB-->>API: Repository info
    API->>Q: Publish DocumentationJob
    API-->>U: 202 Accepted (jobId)

    %% Worker Processing
    Q->>W: Consume job
    W->>R: Update progress: processing
    W->>DB: Get GitHub installation
    W->>GH: Fetch repository files
    GH-->>W: File list & contents

    %% File Processing Loop
    loop For each file
        W->>W: Extract code context
        W->>W: Generate prompt
        W->>LLM: Send documentation request
        LLM-->>W: Generated documentation
        W->>DB: Store file documentation
        W->>R: Update progress (n/total files)
        W->>Q: Publish progress update
    end

    %% Summary Generation
    W->>LLM: Generate repository summary
    LLM-->>W: Summary content
    W->>DB: Store summary
    W->>R: Update progress: completed
    W->>Q: Publish completion

    %% Progress Polling
    loop While processing
        U->>API: GET /documentation/progress/:jobId
        API->>R: Get progress
        R-->>API: Progress data
        API-->>U: Progress update
    end

    %% Final Result
    U->>API: GET /documentation/:repositoryId
    API->>DB: Fetch documentation
    DB-->>API: Documentation data
    API-->>U: Complete documentation
```

## Key Components

### 1. Documentation Controller
- **Location**: `/modules/documentation/controllers/documentation-controller.ts`
- **Responsibilities**:
  - Authenticate requests
  - Create job IDs
  - Publish jobs to queue
  - Return 202 Accepted for async operations
  - Serve progress and final results

### 2. Queue Service
- **Location**: `/services/queueService.ts`
- **Technology**: RabbitMQ
- **Queues**:
  - `documentation_jobs`: Main job queue with priority support
  - `progress_updates`: Topic exchange for real-time updates
- **Features**:
  - Durable queues for reliability
  - Priority queuing (max priority: 10)
  - Dead letter queue for failed jobs

### 3. Documentation Worker
- **Location**: `/workers/documentationWorker.ts`
- **Responsibilities**:
  - Consume jobs from queue
  - Orchestrate documentation generation
  - Update progress in Redis
  - Handle errors and retries
  - Graceful shutdown handling

### 4. Documentation Service
- **Location**: `/modules/documentation/services/documentation-service.ts`
- **Features**:
  - File-based documentation generation
  - Repository context extraction
  - Progress callbacks
  - Error handling with partial success

### 5. File Documentation Service
- **Location**: `/services/file-documentation.service.ts`
- **Processing Strategy**:
  - Individual file processing
  - Smart context extraction
  - Project type detection
  - Batch processing support
  - Repository summary generation

### 6. LLM Integration
- **Primary**: OpenAI Service
- **Secondary**: Anthropic Service (fallback)
- **Features**:
  - Rate limiting with exponential backoff
  - Token tracking and cost calculation
  - Request queuing
  - Configurable models

### 7. Progress Tracking
- **Technology**: Redis
- **TTL**: 1 hour per job
- **Data Structure**:
  ```json
  {
    "jobId": "uuid",
    "status": "processing",
    "currentFile": 15,
    "totalFiles": 50,
    "error": null,
    "completedAt": null
  }
  ```

## Error Handling

### Retry Mechanism
1. **File Level**: Each file is retried up to 3 times
2. **Partial Success**: Documentation saved even if some files fail
3. **Error Tracking**: Detailed errors stored in `documentation_generations` table

### Failure Scenarios
- **GitHub API Failure**: Job marked as failed, error stored
- **LLM API Failure**: Individual file retry, fallback to secondary LLM
- **Worker Crash**: Job remains in queue, picked up by another worker
- **Database Failure**: Job marked as failed, user notified

## Performance Optimizations

### 1. Smart Chunking
- Groups related files together
- Respects token limits
- Prioritizes important files

### 2. Caching
- GitHub API responses cached in Redis
- Repository metadata cached
- Progress data cached with TTL

### 3. Parallel Processing
- Multiple workers can process different repositories
- File processing can be parallelized within limits
- Progress updates are non-blocking

### 4. Connection Pooling
- Database connection pooling
- HTTP keep-alive for API calls
- RabbitMQ channel reuse

## Monitoring Points

1. **Queue Depth**: Monitor `documentation_jobs` queue size
2. **Processing Time**: Track job completion times
3. **Error Rate**: Monitor failed jobs and retries
4. **API Usage**: Track LLM token usage and costs
5. **Worker Health**: Monitor worker memory and CPU usage

## Security Considerations

1. **Authentication**: JWT validation on all endpoints
2. **Authorization**: Row-level security in PostgreSQL
3. **Token Storage**: GitHub tokens encrypted at rest
4. **Input Validation**: File paths and content sanitized
5. **Rate Limiting**: API and LLM request throttling

## Scalability

The architecture supports horizontal scaling at multiple levels:

1. **API Servers**: Stateless, can be load balanced
2. **Workers**: Multiple workers can process jobs concurrently
3. **Queue**: RabbitMQ can be clustered
4. **Database**: Supabase handles scaling
5. **Cache**: Redis can be clustered

## Future Enhancements

1. **Webhook Support**: Real-time updates via webhooks
2. **Incremental Updates**: Only process changed files
3. **Multi-LLM Strategy**: Intelligent routing between providers
4. **Custom Prompts**: User-defined documentation templates
5. **Batch Operations**: Process multiple repositories in one job