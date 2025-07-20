# API Layer Architecture

## Overview

The API layer provides a clean, type-safe interface between the frontend application and the backend services. It's built on Axios with custom interceptors for authentication and error handling.

## Core Components

### 1. API Configuration (`src/api/api.ts`)

The central configuration file that sets up Axios instances and interceptors.

#### Axios Instances

```typescript
// Standard API instance (10-second timeout)
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Long-running operations instance (5-minute timeout)
export const apiLongRunning = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 300000, // 5 minutes
  headers: {
    'Content-Type': 'application/json',
  },
})
```

#### Authentication Interceptors

**Request Interceptor**: Automatically adds authentication token
```typescript
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)
```

**Response Interceptor**: Handles token refresh and authentication errors
```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        await useAuthStore.getState().refreshAuth()
        return api(originalRequest)
      } catch (refreshError) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    
    return Promise.reject(error)
  }
)
```

## Service Modules

### 2. Authentication Service (`src/services/auth.ts`)

Handles all authentication-related API calls.

#### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/auth/register` | User registration |
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/refresh` | Token refresh |
| GET | `/api/v1/auth/me` | Get current user |
| POST | `/api/v1/auth/logout` | User logout |
| GET | `/api/v1/auth/github` | GitHub OAuth URL |

#### Type Definitions

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
```

#### Key Methods

```typescript
export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post('/api/v1/auth/register', data)
    return response.data
  },

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await api.post('/api/v1/auth/login', data)
    return response.data
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await api.post('/api/v1/auth/refresh', { refreshToken })
    return response.data
  },
}
```

### 3. Documentation Service (`src/services/documentation.ts`)

Manages documentation generation and retrieval.

#### Endpoints

**Legacy Single-Page Documentation**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/documentation` | Get all documentation |
| GET | `/api/v1/documentation/{repositoryId}` | Get repository documentation |
| POST | `/api/v1/documentation/generate/{repositoryId}` | Generate documentation |

**File-Based Documentation**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/documentation/generate-files/{repositoryId}` | Generate file-based docs |
| GET | `/api/v1/documentation/progress/{jobId}` | Track generation progress |
| GET | `/api/v1/documentation/{repositoryId}/files` | Get file list |
| GET | `/api/v1/documentation/{repositoryId}/files/{filePath}` | Get file documentation |
| GET | `/api/v1/documentation/{repositoryId}/summary` | Get repository summary |

#### Key Features

**Asynchronous Job Processing**
```typescript
async generateFiles(
  repositoryId: string,
  onProgress?: (progress: JobProgress) => void
): Promise<JobProgress> {
  const response = await apiLongRunning.post(
    `/api/v1/documentation/generate-files/${repositoryId}`
  )
  const jobId = response.data.jobId

  if (onProgress) {
    // Poll for progress
    const pollInterval = setInterval(async () => {
      const progress = await this.getProgress(jobId)
      onProgress(progress)
      
      if (progress.status === 'completed' || progress.status === 'failed') {
        clearInterval(pollInterval)
      }
    }, 2000)
  }

  return response.data
}
```

**File Tree Building**
```typescript
buildFileTree(files: DocumentationFile[]): FileTreeNode[] {
  // Converts flat file list to hierarchical tree structure
  // Handles nested directories and file organization
}
```

### 4. GitHub Service (`src/services/github.ts`)

Manages GitHub App integration and repository access.

#### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/auth/github-app/install` | Get installation URL |
| GET | `/api/v1/auth/github-app/installations` | List installations |
| GET | `/api/v1/auth/github-app/repositories` | Get repositories |
| GET | `/api/v1/auth/github-app/installations/{id}/repositories` | Get installation repos |

#### Key Methods

```typescript
export const githubService = {
  async getInstallationUrl(): Promise<string> {
    const response = await api.get('/api/v1/auth/github-app/install')
    return response.data.installUrl
  },

  async getRepositories(filters?: RepositoryFilters): Promise<GitHubRepository[]> {
    const response = await api.get('/api/v1/auth/github-app/repositories', {
      params: filters
    })
    return response.data.repositories
  },
}
```

## Error Handling

### Standardized Error Response

All services follow a consistent error handling pattern:

```typescript
try {
  const response = await api.post('/endpoint', data)
  return response.data
} catch (error) {
  if (axios.isAxiosError(error) && error.response) {
    throw new Error(
      error.response.data.error?.message || 'An error occurred'
    )
  }
  throw error
}
```

### Error Response Format

Backend errors are expected in this format:
```typescript
{
  error: {
    message: string
    code?: string
    details?: any
  }
}
```

## Best Practices

### 1. **Type Safety**
- All API responses have TypeScript interfaces
- Request parameters are typed
- No `any` types in service methods

### 2. **Error Handling**
- Consistent error extraction
- User-friendly error messages
- Proper error propagation

### 3. **Authentication**
- Automatic token attachment
- Token refresh without user intervention
- Secure token storage

### 4. **Performance**
- Separate timeout configurations
- Request cancellation support
- Efficient polling mechanisms

### 5. **Modularity**
- Domain-specific service files
- Reusable API configuration
- Clear separation of concerns

## Integration with State Management

Services integrate seamlessly with Zustand stores:

```typescript
// In auth store
async login(email: string, password: string) {
  try {
    set({ isLoading: true, error: null })
    const response = await authService.login({ email, password })
    
    set({
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      isAuthenticated: true,
      isLoading: false,
    })
  } catch (error) {
    set({
      error: error.message,
      isLoading: false,
    })
  }
}
```

## Security Considerations

1. **Token Security**
   - Tokens stored in memory and localStorage
   - Automatic token refresh
   - Tokens cleared on logout

2. **API Security**
   - HTTPS enforced in production
   - CORS properly configured
   - Input validation on all requests

3. **Error Information**
   - Sensitive data never exposed in errors
   - Generic messages for security errors
   - Detailed logging only in development

## Future Enhancements

1. **Request Caching**
   - Implement request deduplication
   - Add response caching layer
   - Use React Query for server state

2. **Retry Logic**
   - Exponential backoff for failed requests
   - Configurable retry attempts
   - Network status detection

3. **Request Cancellation**
   - AbortController integration
   - Automatic cancellation on unmount
   - Manual cancellation support

4. **WebSocket Support**
   - Real-time progress updates
   - Live documentation updates
   - Collaborative features