# State Management Architecture

## Overview

The application uses **Zustand v4.4.1** for state management. Zustand is a lightweight, TypeScript-first state management solution that provides a simple API with minimal boilerplate.

## Why Zustand?

### Advantages
1. **Minimal Boilerplate**: No providers, actions, or reducers needed
2. **TypeScript First**: Built with TypeScript in mind
3. **Simple API**: Easy to learn and use
4. **Performance**: Built-in optimization with shallow equality checks
5. **Middleware Support**: Persistence, devtools, and more
6. **Small Bundle Size**: ~8KB minified

### Comparison with Alternatives
- **vs Redux**: 90% less boilerplate, simpler mental model
- **vs Context API**: Better performance, no provider hell
- **vs MobX**: Simpler, more predictable, better TypeScript support

## Store Architecture

### Auth Store (`src/store/auth-store.ts`)

The primary store managing authentication state across the application.

#### Store Definition
```typescript
interface AuthState {
  // State
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  initializeAuth: () => Promise<void>
  setUser: (user: User | null) => void
  setTokens: (accessToken: string | null, refreshToken: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}
```

#### Key Features

**1. Persistence**
```typescript
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ... store implementation
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
```

**2. Async Actions**
```typescript
login: async (email: string, password: string) => {
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
      error: error instanceof Error ? error.message : 'Login failed',
      isLoading: false,
    })
    throw error
  }
}
```

**3. Token Management**
```typescript
refreshAuth: async () => {
  const { refreshToken } = get()
  if (!refreshToken) throw new Error('No refresh token')

  try {
    const response = await authService.refreshToken(refreshToken)
    set({
      user: response.user,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
    })
  } catch (error) {
    get().logout()
    throw error
  }
}
```

## State Access Patterns

### 1. Direct Store Access
```typescript
// In components
import { useAuthStore } from '@/store/auth-store'

function LoginButton() {
  const { login, isLoading } = useAuthStore()
  
  const handleLogin = () => {
    login(email, password)
  }
}
```

### 2. Selective Subscriptions
```typescript
// Only re-render when specific values change
const user = useAuthStore((state) => state.user)
const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
```

### 3. Outside React Components
```typescript
// Access store outside React
const token = useAuthStore.getState().accessToken

// Subscribe to changes
const unsubscribe = useAuthStore.subscribe(
  (state) => state.user,
  (user) => console.log('User changed:', user)
)
```

## Integration with Services

### API Interceptors
```typescript
// In api.ts
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  }
)
```

### Custom Hooks
```typescript
// useGitHub.ts integrates with auth
export function useGitHub() {
  const { user } = useAuthStore()
  
  // Use user context for GitHub operations
  const loadRepositories = async () => {
    if (!user) return
    // ... load repos for authenticated user
  }
}
```

## State Flow Patterns

### 1. User Authentication Flow
```
User Action → Store Action → API Call → Update State → UI Update
     ↓             ↓              ↓           ↓            ↓
   Login      login()      authService   setState()   Re-render
```

### 2. Token Refresh Flow
```
API 401 Error → Interceptor → refreshAuth() → New Tokens → Retry Request
                                    ↓
                              Fail → Logout → Redirect
```

### 3. Initialization Flow
```
App Mount → initializeAuth() → Check Stored Tokens → Validate → Set User
                                        ↓
                                   No Tokens → Guest State
```

## Best Practices

### 1. Action Organization
```typescript
// Group related actions
const authActions = {
  login,
  logout,
  register,
  refreshAuth,
}

// Separate state updates from business logic
const stateSetters = {
  setUser,
  setTokens,
  setLoading,
  setError,
}
```

### 2. Error Handling
```typescript
// Consistent error handling pattern
try {
  set({ isLoading: true, error: null })
  // ... perform action
  set({ /* success state */ })
} catch (error) {
  set({ 
    error: error instanceof Error ? error.message : 'An error occurred',
    isLoading: false 
  })
  throw error // Allow components to handle
}
```

### 3. State Normalization
```typescript
// Keep state flat and normalized
interface AppState {
  users: Record<string, User>
  repositories: Record<string, Repository>
  currentUserId: string | null
}

// Instead of nested structures
interface BadState {
  user: {
    profile: User
    repositories: Repository[]
  }
}
```

### 4. Computed Values
```typescript
// Derive values in selectors, not state
const selectUserRepositories = (state: AppState) => {
  if (!state.currentUserId) return []
  return Object.values(state.repositories).filter(
    repo => repo.userId === state.currentUserId
  )
}
```

## Performance Optimization

### 1. Selective Subscriptions
```typescript
// Bad - subscribes to entire store
const store = useAuthStore()

// Good - subscribes only to needed values
const user = useAuthStore(state => state.user)
const login = useAuthStore(state => state.login)
```

### 2. Shallow Equality
```typescript
// Use shallow for object/array selections
const repositories = useAuthStore(
  state => state.repositories,
  shallow
)
```

### 3. Memoization
```typescript
// Memoize expensive computations
const expensiveValue = useAuthStore(
  state => useMemo(
    () => computeExpensive(state.data),
    [state.data]
  )
)
```

## Testing Strategies

### 1. Store Testing
```typescript
describe('AuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
    })
  })

  it('should login user', async () => {
    await useAuthStore.getState().login('test@example.com', 'password')
    
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().user).toBeDefined()
  })
})
```

### 2. Component Testing
```typescript
// Mock store in tests
jest.mock('@/store/auth-store', () => ({
  useAuthStore: jest.fn(() => ({
    user: mockUser,
    login: jest.fn(),
    isLoading: false,
  }))
}))
```

## DevTools Integration

### Zustand DevTools
```typescript
// Enable Redux DevTools
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set) => ({
        // ... store implementation
      }),
      { name: 'auth-storage' }
    ),
    { name: 'AuthStore' }
  )
)
```

### Debugging
```typescript
// Log state changes
useAuthStore.subscribe(console.log)

// Inspect current state
console.log(useAuthStore.getState())
```

## Future Enhancements

### 1. Additional Stores
```typescript
// Planned stores
- useRepositoryStore // Repository management
- useDocumentationStore // Documentation state
- useUIStore // UI preferences and settings
- useNotificationStore // In-app notifications
```

### 2. Store Composition
```typescript
// Combine multiple stores
const useStore = create(() => ({
  ...useAuthStore.getState(),
  ...useRepositoryStore.getState(),
}))
```

### 3. Middleware Enhancements
```typescript
// Custom middleware for logging
const logger = (config) => (set, get, api) =>
  config(
    (...args) => {
      console.log('Previous state:', get())
      set(...args)
      console.log('New state:', get())
    },
    get,
    api
  )
```

### 4. Real-time Sync
```typescript
// WebSocket integration for real-time updates
const subscribeToUpdates = () => {
  socket.on('userUpdate', (user) => {
    useAuthStore.getState().setUser(user)
  })
}
```