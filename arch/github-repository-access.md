# GitHub Repository Access Architecture

## Overview

This document outlines the technical architecture for implementing granular, per-repository GitHub access control in the Lexicode SaaS platform. The system allows authenticated users to selectively grant the application access to specific GitHub repositories for documentation generation while maintaining security and scalability.

## Architecture Principles

- **Least Privilege**: Request only necessary permissions for each repository
- **User Consent**: Explicit user approval for each repository access
- **Token Security**: Secure storage and rotation of GitHub access tokens
- **Audit Trail**: Complete logging of all repository access operations
- **Scalability**: Support for users with hundreds of repositories

## Permission Model

### GitHub App Permissions Model

The application uses GitHub Apps with granular, repository-level permissions:

1. **App Authentication** (Server-to-Server)
   - JWT-based app authentication using private key
   - Installation access tokens for specific repositories
   - No user session dependency

2. **User Authentication** (Optional)
   - OAuth flow for user identity (`read:user`, `user:email`)
   - Used only for user profile information
   - Separate from repository access permissions

**Required GitHub App Permissions:**
- `Contents: Read` - Access repository files and content
- `Metadata: Read` - Basic repository information
- `Pull requests: Read` (optional) - Access PR information for documentation context
- `Issues: Read` (optional) - Access issues for documentation context

### GitHub Apps vs OAuth Apps

**Recommended Approach: GitHub App**

- **Granular Permissions**: Repository-level installations
- **Better Security**: Limited scope per installation
- **Webhook Support**: Native repository event handling
- **Rate Limits**: Higher API rate limits
- **Transparency**: Users can see exactly what repositories have access

## Database Schema

### Core Tables

```sql
-- GitHub App installations per user
CREATE TABLE github_installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_installation_id BIGINT NOT NULL,
    github_account_id BIGINT NOT NULL,
    github_account_login VARCHAR(255) NOT NULL,
    installation_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, github_installation_id)
);

-- Repository access tracking
CREATE TABLE repository_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_installation_id UUID NOT NULL REFERENCES github_installations(id) ON DELETE CASCADE,
    github_repo_id BIGINT NOT NULL,
    repo_full_name VARCHAR(512) NOT NULL,
    repo_name VARCHAR(255) NOT NULL,
    repo_owner VARCHAR(255) NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT false,
    default_branch VARCHAR(255) NOT NULL DEFAULT 'main',
    language VARCHAR(100),
    access_granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_status ENUM('active', 'suspended', 'revoked') DEFAULT 'active',
    webhook_id BIGINT,
    webhook_secret_encrypted TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, github_repo_id)
);

-- Repository access audit log
CREATE TABLE repository_access_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_access_id UUID NOT NULL REFERENCES repository_access(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action ENUM('granted', 'revoked', 'suspended', 'accessed', 'webhook_created', 'webhook_deleted') NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repository synchronization tracking
CREATE TABLE repository_sync_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_access_id UUID NOT NULL REFERENCES repository_access(id) ON DELETE CASCADE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
    sync_error TEXT,
    files_processed INTEGER DEFAULT 0,
    total_files INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(repository_access_id)
);
```

### Indexes

```sql
CREATE INDEX idx_github_installations_user_id ON github_installations(user_id);
CREATE INDEX idx_repository_access_user_id ON repository_access(user_id);
CREATE INDEX idx_repository_access_github_repo_id ON repository_access(github_repo_id);
CREATE INDEX idx_repository_access_status ON repository_access(access_status);
CREATE INDEX idx_repository_access_audit_repository_id ON repository_access_audit(repository_access_id);
CREATE INDEX idx_repository_sync_status_repository_id ON repository_sync_status(repository_access_id);
```

## API Design

### GitHub App Installation Flow

```typescript
// 1. Initiate GitHub App installation
POST /api/v1/github/app/install
Response: {
  installationUrl: string; // GitHub's installation URL
  state: string; // CSRF protection token
}

// GitHub App Registration Requirements:
// - User authorization callback URL: https://your-app.com/api/v1/github/app/callback
// - Setup URL: https://your-app.com/setup (post-installation configuration)
// - Webhook URL: https://your-app.com/api/v1/webhooks/github
// - Permissions: Contents:Read, Metadata:Read
// - Webhook events: push, pull_request, installation, installation_repositories

// 2. Handle installation callback
POST /api/v1/github/app/callback
Body: {
  installationId: number;
  setupAction: 'install' | 'update';
  repositories?: Array<{
    id: number;
    name: string;
    fullName: string;
  }>;
}

// 3. Get user's GitHub installations
GET /api/v1/github/installations
Response: {
  installations: Array<{
    id: string;
    githubInstallationId: number;
    accountLogin: string;
    permissions: object;
    repositoryCount: number;
    createdAt: string;
  }>;
}
```

### Repository Management

```typescript
// List available repositories from installations
GET /api/v1/github/repositories/available
Query: {
  installationId?: string;
  search?: string;
  type?: 'all' | 'private' | 'public';
  sort?: 'name' | 'updated' | 'stars';
  page?: number;
  limit?: number;
}

// Grant access to specific repositories
POST /api/v1/github/repositories/access
Body: {
  repositories: Array<{
    githubRepoId: number;
    installationId: string;
  }>;
}

// Revoke repository access
DELETE /api/v1/github/repositories/:repositoryId/access

// List user's accessible repositories
GET /api/v1/github/repositories
Query: {
  status?: 'active' | 'suspended' | 'revoked';
  search?: string;
  page?: number;
  limit?: number;
}

// Get repository details and sync status
GET /api/v1/github/repositories/:repositoryId
Response: {
  id: string;
  githubRepoId: number;
  fullName: string;
  name: string;
  owner: string;
  isPrivate: boolean;
  defaultBranch: string;
  language: string;
  accessStatus: string;
  syncStatus: object;
  lastAccessed: string;
  webhookConfigured: boolean;
}
```

### Webhook Management

```typescript
// Configure repository webhook
POST /api/v1/github/repositories/:repositoryId/webhook
Body: {
  events: Array<'push' | 'pull_request' | 'release'>;
}

// Remove repository webhook
DELETE /api/v1/github/repositories/:repositoryId/webhook

// Webhook endpoint for GitHub events
POST /api/v1/webhooks/github
Headers: {
  'X-GitHub-Event': string;
  'X-GitHub-Delivery': string;
  'X-Hub-Signature-256': string;
}
```

## Service Architecture

### GitHubAppService

```typescript
export class GitHubAppService {
  // GitHub App authentication (JWT-based)
  async generateJWT(): Promise<string>;
  async generateInstallationToken(installationId: number): Promise<string>;
  async refreshInstallationToken(installationId: string): Promise<void>;
  async validateInstallationToken(installationId: string): Promise<boolean>;
  
  // Installation management
  async handleInstallationCallback(payload: InstallationPayload): Promise<void>;
  async syncInstallationRepositories(installationId: string): Promise<void>;
  async getInstallationRepositories(installationId: string): Promise<Repository[]>;
  
  // Repository access
  async grantRepositoryAccess(userId: string, repositories: RepositoryAccessRequest[]): Promise<void>;
  async revokeRepositoryAccess(userId: string, repositoryId: string): Promise<void>;
  async checkRepositoryAccess(userId: string, githubRepoId: number): Promise<boolean>;
  
  // Webhook management
  async createRepositoryWebhook(repositoryAccessId: string): Promise<void>;
  async deleteRepositoryWebhook(repositoryAccessId: string): Promise<void>;
  async processWebhookEvent(event: WebhookEvent): Promise<void>;
}
```

### RepositoryAccessService

```typescript
export class RepositoryAccessService {
  // Access management
  async getUserRepositories(userId: string, filters: RepositoryFilters): Promise<Repository[]>;
  async getRepositoryDetails(userId: string, repositoryId: string): Promise<RepositoryDetails>;
  async updateRepositoryAccess(repositoryId: string, updates: RepositoryUpdates): Promise<void>;
  
  // Synchronization
  async syncRepositoryContent(repositoryId: string): Promise<SyncResult>;
  async getSyncStatus(repositoryId: string): Promise<SyncStatus>;
  async retryFailedSync(repositoryId: string): Promise<void>;
  
  // Audit and monitoring
  async logRepositoryAccess(repositoryId: string, action: string, details?: object): Promise<void>;
  async getRepositoryAuditLog(repositoryId: string): Promise<AuditEntry[]>;
}
```

## Security Implementation

### Token Management

```typescript
export class GitHubTokenService {
  // JWT generation for app authentication
  async generateAppJWT(): Promise<string>; // Using private key, 10-minute expiry
  
  // Installation token management
  async generateInstallationToken(installationId: number): Promise<{
    token: string;
    expiresAt: Date; // GitHub tokens expire in 1 hour
  }>;
  
  // Encrypt installation tokens before database storage
  async encryptToken(token: string): Promise<string>;
  async decryptToken(encryptedToken: string): Promise<string>;
  
  // Token validation and refresh
  async validateTokenExpiry(installationId: string): Promise<boolean>;
  async refreshInstallationToken(installationId: string): Promise<void>;
  
  // Secure token cleanup
  async revokeExpiredTokens(): Promise<void>;
  async cleanupRevokedAccess(): Promise<void>;
}
```

### Access Control Middleware

```typescript
export const requireRepositoryAccess = (
  action: 'read' | 'write' | 'admin'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { repositoryId } = req.params;
    const { userId } = req.user;
    
    const hasAccess = await repositoryAccessService.checkUserAccess(
      userId,
      repositoryId,
      action
    );
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Repository access denied' });
    }
    
    // Log access attempt
    await repositoryAccessService.logRepositoryAccess(
      repositoryId,
      'accessed',
      { action, userAgent: req.headers['user-agent'] }
    );
    
    next();
  };
};
```

### Webhook Security

```typescript
export class WebhookSecurityService {
  // Verify GitHub webhook signatures
  async verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): Promise<boolean>;
  
  // Generate and store webhook secrets
  async generateWebhookSecret(): Promise<string>;
  async getWebhookSecret(repositoryId: string): Promise<string>;
}
```

## Implementation Phases

### Phase 1: GitHub App Registration and Setup (Week 1-2)
- Register GitHub App with required permissions (Contents:Read, Metadata:Read)
- Configure callback URLs, webhook endpoint, and setup URL
- Generate and securely store private key for JWT authentication
- Implement JWT generation and installation token management
- Set up basic database schema for installations and repository access

### Phase 2: Repository Discovery and Access Control (Week 3-4)
- Build repository listing and filtering APIs
- Implement granular access control
- Create audit logging system
- Add repository access management UI

### Phase 3: Webhook Integration and Sync (Week 5-6)
- Implement webhook creation and management
- Build repository synchronization system
- Add real-time event processing
- Create sync status tracking

### Phase 4: Security Hardening and Monitoring (Week 7-8)
- Add comprehensive token encryption
- Implement access control middleware
- Set up monitoring and alerting
- Complete security audit and testing

### Phase 5: Performance Optimization and Scale Testing (Week 9-10)
- Optimize database queries and indexes
- Implement caching strategies
- Load test with high repository counts
- Performance monitoring and optimization

## Monitoring and Observability

### Key Metrics
- Installation success/failure rates
- Repository access grant/revoke rates
- Token refresh success rates
- Webhook delivery success rates
- API response times for repository operations

### Alerting
- Failed GitHub App installations
- Token refresh failures
- Webhook delivery failures
- Unusual access pattern detection
- High error rates in repository operations

### Logging
- All repository access events with user context
- GitHub API rate limit consumption
- Installation and token lifecycle events
- Webhook event processing results

## Compliance and Privacy

### Data Retention
- Repository metadata cached for 30 days after access revocation
- Audit logs retained for 1 year
- Encrypted tokens purged immediately upon revocation

### GDPR Compliance
- User data export includes all repository access history
- Data deletion removes all repository access and related data
- Consent tracking for each repository access grant

### Security Compliance
- SOC 2 Type II controls for token management
- Regular security audits of GitHub integration
- Penetration testing of webhook endpoints

## Rollout Strategy

### Beta Testing (2 weeks)
- Internal team testing with limited repositories
- Small group of trusted external users
- Monitor for edge cases and performance issues

### Gradual Rollout (4 weeks)
- 10% of users in week 1
- 25% of users in week 2
- 50% of users in week 3
- 100% of users in week 4

### Feature Flags
- Enable/disable GitHub App integration
- Control repository access limits per user
- Toggle webhook functionality
- Emergency access revocation capability

## Success Metrics

### Technical Metrics
- 99.9% uptime for repository access APIs
- <200ms response time for repository listing
- <30 seconds for repository sync completion
- 100% webhook delivery success rate

### Business Metrics
- >80% user adoption of repository access feature
- <5% support tickets related to GitHub integration
- >95% user satisfaction with repository management
- <1% repository access revocation rate due to issues

## GitHub App Configuration Checklist

### Required Registration Settings
- **App Name**: Lexicode Documentation Generator
- **Description**: AI-powered documentation generation for GitHub repositories
- **Homepage URL**: https://lexicode.dev
- **User authorization callback URL**: https://api.lexicode.dev/v1/github/app/callback
- **Setup URL**: https://lexicode.dev/setup
- **Webhook URL**: https://api.lexicode.dev/v1/webhooks/github
- **Permissions**:
  - Contents: Read (access repository files)
  - Metadata: Read (basic repository information)
  - Pull requests: Read (optional, for context)
- **Webhook Events**:
  - push (code changes)
  - installation (app installation events)
  - installation_repositories (repository selection changes)
- **Private Key**: Generate and store securely for JWT authentication

### Rate Limits and Quotas
- GitHub Apps: 5,000 requests per hour per installation
- JWT tokens: 10-minute expiry, must be regenerated
- Installation tokens: 1-hour expiry, can be refreshed
- Webhook delivery: 30-second timeout per event

## Future Enhancements

### Advanced Features
- Repository access templates for teams
- Bulk repository management operations
- Integration with GitHub Enterprise Server
- Advanced webhook filtering and routing

### Scalability Improvements
- Repository metadata caching with Redis
- Asynchronous repository discovery
- Batch processing for large installations
- Geographic distribution of webhook endpoints