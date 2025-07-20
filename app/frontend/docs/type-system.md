# Type System Architecture

## Overview

The application uses TypeScript throughout with comprehensive type definitions for all data structures, API responses, and component props. This ensures type safety, better developer experience, and fewer runtime errors.

## Core Type Definitions

### Authentication Types

Located in `src/services/auth.ts`:

```typescript
interface User {
  id: string
  email: string
  username?: string
  fullName?: string
  avatarUrl?: string
  emailVerifiedAt?: Date
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  subscriptionTier: string
}

interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

interface RegisterData {
  email: string
  password: string
  fullName?: string
  username?: string
}

interface LoginData {
  email: string
  password: string
}
```

### Documentation Types

Located in `src/types/documentation.ts`:

```typescript
// Base documentation model
export interface Documentation {
  id: string
  repository_id: string
  content: string
  metadata: {
    total_files: number
    total_lines: number
    languages: Record<string, number>
    generated_at: string
    version: string
  }
  created_at: string
  updated_at: string
}

// Documentation with repository info
export interface DocumentationItem extends Documentation {
  repository_name: string
  repository_full_name: string
  language?: string
  is_private: boolean
}

// File-based documentation
export interface DocumentationFile {
  file_path: string
  file_name: string
  language?: string
  size_bytes: number
  documentation_exists: boolean
  last_modified?: string
}

export interface DocumentationFileDetail extends DocumentationFile {
  content: string
  metadata?: {
    lines_of_code?: number
    complexity?: number
    dependencies?: string[]
  }
}

// Repository summary
export interface DocumentationSummary {
  repository_id: string
  repository_name: string
  total_files: number
  documented_files: number
  coverage_percentage: number
  languages: Record<string, number>
  last_generated: string
}

// File tree representation
export interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileTreeNode[]
  hasDocumentation?: boolean
  language?: string
}

// Job progress tracking
export interface JobProgress {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  totalFiles: number
  processedFiles: number
  currentFile?: string
  error?: string
  result?: any
}
```

### GitHub Integration Types

Located in `src/services/github.ts`:

```typescript
export interface GitHubInstallation {
  id: string
  github_installation_id: number
  github_account_id: number
  github_account_login: string
  github_account_type: 'User' | 'Organization'
  github_account_avatar_url?: string
  permissions: Record<string, string>
  created_at: string
  updated_at: string
}

export interface GitHubRepository {
  id: string
  github_repo_id: number
  repo_full_name: string
  repo_name: string
  repo_owner: string
  repo_description?: string
  repo_url: string
  is_private: boolean
  is_archived: boolean
  default_branch: string
  language?: string
  languages?: Record<string, number>
  size_kb: number
  stars_count: number
  forks_count: number
  access_granted_at: string
  last_accessed_at?: string
  access_status: 'active' | 'suspended' | 'revoked'
  documentation_status?: 'none' | 'partial' | 'complete'
  last_documentation_generated_at?: string
  created_at: string
  updated_at: string
}

export interface RepositoryFilters {
  search?: string
  language?: string
  access_status?: 'active' | 'suspended' | 'revoked'
  documentation_status?: 'none' | 'partial' | 'complete'
  is_private?: boolean
  page?: number
  limit?: number
}
```

## Component Props Types

### Layout Components

```typescript
// Layout.tsx
interface LayoutProps {
  children: ReactNode
}

// ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: ReactNode
  redirectTo?: string
}
```

### Documentation Components

```typescript
// MultiPageDocumentationView.tsx
interface MultiPageDocumentationViewProps {
  repositoryId: string
  repositoryName: string
  onRegenerate?: () => void
}

// DocumentationBreadcrumb.tsx
interface DocumentationBreadcrumbProps {
  repositoryName: string
  filePath?: string
  onNavigate?: (path?: string) => void
}

// DocumentationQuickActions.tsx
interface DocumentationQuickActionsProps {
  onDownload: () => void
  onRegenerate: () => void
  onSearch?: () => void
  onShare?: () => void
  onExportAll?: () => void
  documentationUrl?: string
  isRegenerating?: boolean
}

// FileTree.tsx
interface FileTreeProps {
  nodes: FileTreeNode[]
  onFileSelect: (path: string) => void
  selectedPath?: string
  expandedPaths?: Set<string>
  onToggleExpand?: (path: string) => void
}

// GenerationProgress.tsx
interface GenerationProgressProps {
  totalFiles: number
  processedFiles: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  estimatedTimeRemaining?: number
  currentFile?: string
  onCancel?: () => void
}
```

## API Response Types

### Standard Response Wrapper

```typescript
interface ApiResponse<T> {
  data: T
  message?: string
  timestamp: string
}

interface ApiError {
  error: {
    message: string
    code?: string
    details?: Record<string, any>
  }
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
```

### Authentication Responses

```typescript
interface LoginResponse {
  user: User
  accessToken: string
  refreshToken: string
}

interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
}

interface GitHubOAuthResponse {
  user: User
  accessToken: string
  refreshToken: string
  isNewUser: boolean
}
```

## Utility Types

### Common Utility Types

```typescript
// Make all properties optional except specified keys
type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>

// Make specified properties optional
type PartialPick<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Extract non-nullable type
type NonNullable<T> = T extends null | undefined ? never : T

// Deep partial type
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
```

### Form Types

```typescript
interface FormField<T = string> {
  value: T
  error?: string
  touched: boolean
}

interface FormState<T> {
  values: T
  errors: Partial<Record<keyof T, string>>
  touched: Partial<Record<keyof T, boolean>>
  isSubmitting: boolean
  isValid: boolean
}
```

## Type Guards

### User Type Guards

```typescript
export function isUser(obj: any): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.isActive === 'boolean'
  )
}

export function hasValidTokens(obj: any): obj is { accessToken: string; refreshToken: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.accessToken === 'string' &&
    typeof obj.refreshToken === 'string'
  )
}
```

### API Response Guards

```typescript
export function isApiError(error: any): error is ApiError {
  return (
    error &&
    typeof error === 'object' &&
    'error' in error &&
    typeof error.error === 'object' &&
    'message' in error.error
  )
}

export function isJobProgress(obj: any): obj is JobProgress {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.jobId === 'string' &&
    ['pending', 'processing', 'completed', 'failed'].includes(obj.status)
  )
}
```

## Enum Types

### Status Enums

```typescript
export enum DocumentationStatus {
  None = 'none',
  Partial = 'partial',
  Complete = 'complete',
  Generating = 'generating',
  Failed = 'failed'
}

export enum RepositoryAccessStatus {
  Active = 'active',
  Suspended = 'suspended',
  Revoked = 'revoked'
}

export enum SubscriptionTier {
  Free = 'free',
  Pro = 'pro',
  Enterprise = 'enterprise'
}

export enum JobStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed'
}
```

## Generic Types

### Collection Types

```typescript
interface Collection<T> {
  items: T[]
  total: number
  hasMore: boolean
  nextCursor?: string
}

interface KeyedCollection<T> {
  [key: string]: T
}

interface GroupedCollection<T> {
  [category: string]: T[]
}
```

### Action Types

```typescript
interface Action<T = any> {
  type: string
  payload?: T
  error?: boolean
  meta?: Record<string, any>
}

interface AsyncAction<T = any> extends Action<T> {
  status: 'pending' | 'success' | 'failure'
}
```

## Type Composition

### Extending Types

```typescript
// Base repository type
interface BaseRepository {
  id: string
  name: string
  owner: string
}

// Extended with GitHub data
interface GitHubRepositoryData extends BaseRepository {
  github_repo_id: number
  stars_count: number
  language?: string
}

// Extended with documentation data
interface RepositoryWithDocumentation extends GitHubRepositoryData {
  documentation_status: DocumentationStatus
  last_documentation_generated_at?: Date
}
```

### Union Types

```typescript
type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading'

type NotificationType = 'success' | 'error' | 'warning' | 'info'

type ViewMode = 'grid' | 'list' | 'compact'

type SortOrder = 'asc' | 'desc'

type SortField = 'name' | 'date' | 'size' | 'status'
```

## Best Practices

### 1. Type Naming Conventions
- Interfaces: PascalCase (e.g., `User`, `Repository`)
- Type aliases: PascalCase (e.g., `AuthStatus`)
- Enums: PascalCase with PascalCase values
- Generic parameters: Single uppercase letters (e.g., `T`, `K`, `V`)

### 2. Type Organization
- Group related types in dedicated files
- Export all types from index files
- Keep component prop types with components
- Share common types in `types/` directory

### 3. Type Safety
- Avoid `any` type unless absolutely necessary
- Use `unknown` instead of `any` when possible
- Enable strict TypeScript options
- Use type guards for runtime validation

### 4. Documentation
- Document complex types with JSDoc
- Provide examples for generic types
- Explain type parameters
- Note any constraints or requirements

## TypeScript Configuration

### tsconfig.json Key Settings

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  }
}
```

This comprehensive type system ensures type safety throughout the application, improves developer experience with better IntelliSense, and catches potential errors at compile time rather than runtime.