# Database Architecture Documentation

## Overview

The application uses PostgreSQL via Supabase with row-level security (RLS) for data isolation and comprehensive audit logging.

## Database Clients

### Supabase Configuration
```typescript
// Regular client for standard operations
const supabase = createClient(url, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Admin client for privileged operations
const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
```

## Database Schema

### GitHub Integration Tables

#### github_installations
Stores GitHub App installations per user.

```sql
CREATE TABLE github_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  installation_id BIGINT NOT NULL,
  installation_token_encrypted TEXT,
  installation_token_expires_at TIMESTAMPTZ,
  account_type VARCHAR(50),
  account_login VARCHAR(255),
  account_id BIGINT,
  permissions JSONB,
  repository_selection VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, installation_id)
);
```

#### repository_access
Manages user access to repositories.

```sql
CREATE TABLE repository_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  repository_id BIGINT NOT NULL,
  repository_name VARCHAR(255) NOT NULL,
  repository_full_name VARCHAR(512) NOT NULL,
  repository_private BOOLEAN DEFAULT false,
  installation_id BIGINT,
  access_level VARCHAR(50) DEFAULT 'read',
  granted_at TIMESTAMPTZ DEFAULT now(),
  last_accessed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  webhook_id BIGINT,
  webhook_secret_encrypted TEXT,
  webhook_active BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  UNIQUE(user_id, repository_id)
);
```

#### repository_access_audit
Audit log for all repository access actions.

```sql
CREATE TABLE repository_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  repository_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### repository_sync_status
Tracks repository synchronization progress.

```sql
CREATE TABLE repository_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id BIGINT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  sync_status VARCHAR(50) DEFAULT 'pending',
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  files_processed INTEGER DEFAULT 0,
  total_files INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(repository_id, user_id)
);
```

### Documentation Tables

#### documentation
Main documentation storage.

```sql
CREATE TABLE documentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id BIGINT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT,
  version INTEGER DEFAULT 1,
  generation_id UUID REFERENCES documentation_generations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(repository_id, user_id, version)
);
```

#### documentation_generations
Generation job tracking.

```sql
CREATE TABLE documentation_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id BIGINT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status VARCHAR(50) DEFAULT 'pending',
  trigger_type VARCHAR(50) DEFAULT 'manual',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  input_data JSONB,
  output_data JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### documentation_files
File-level documentation.

```sql
CREATE TABLE documentation_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documentation_id UUID NOT NULL REFERENCES documentation(id),
  file_path TEXT NOT NULL,
  content TEXT,
  summary TEXT,
  language VARCHAR(50),
  file_type VARCHAR(50),
  size_bytes INTEGER,
  lines_of_code INTEGER,
  complexity_score FLOAT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(documentation_id, file_path)
);
```

#### documentation_summaries
Repository-level summaries.

```sql
CREATE TABLE documentation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documentation_id UUID NOT NULL REFERENCES documentation(id),
  summary_type VARCHAR(50) DEFAULT 'overview',
  content TEXT,
  key_features JSONB,
  tech_stack JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(documentation_id, summary_type)
);
```

## Security Features

### Row Level Security (RLS)

All tables have RLS enabled with policies ensuring users can only access their own data:

```sql
-- Example policy for repository_access
CREATE POLICY "Users can only view their own repository access"
  ON repository_access FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only modify their own repository access"
  ON repository_access FOR ALL
  USING (auth.uid() = user_id);
```

### Encryption

- **Token Encryption**: Installation tokens and webhook secrets are encrypted before storage
- **Audit Logging**: All sensitive operations are logged with IP and user agent
- **Service Role**: Admin operations use service role key with elevated permissions

### Indexes

Key indexes for performance:

```sql
CREATE INDEX idx_repo_access_user_repo ON repository_access(user_id, repository_id);
CREATE INDEX idx_repo_access_active ON repository_access(is_active) WHERE is_active = true;
CREATE INDEX idx_doc_repo_user ON documentation(repository_id, user_id);
CREATE INDEX idx_doc_gen_status ON documentation_generations(status);
CREATE INDEX idx_audit_user_time ON repository_access_audit(user_id, created_at DESC);
```

## Access Patterns

### User-centric Queries
- All queries filter by user_id for data isolation
- RLS policies enforce access control at database level

### Repository Access
- Check repository_access table for permissions
- Validate installation token hasn't expired
- Log access in audit table

### Documentation Retrieval
- Join documentation with documentation_files for complete data
- Use documentation_summaries for overview information
- Track generation status via documentation_generations

## Migration Strategy

Migrations are stored in `/migrations/` and applied in order:
1. `001_github_integration.sql` - GitHub App tables
2. `002_documentation_tables.sql` - Documentation storage
3. `003_documentation_files_table.sql` - File-level documentation

Future migrations should follow the naming pattern: `XXX_description.sql`