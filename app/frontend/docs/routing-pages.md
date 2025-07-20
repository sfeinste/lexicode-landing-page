# Routing and Pages Architecture

## Overview

The application uses React Router v6 for client-side routing with a clear separation between public and protected routes. All routing configuration is centralized in `App.tsx`.

## Route Structure

### Public Routes
Routes accessible without authentication:

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `LandingPage` | Marketing page with product information |
| `/login` | `LoginPage` | User authentication |
| `/register` | `RegisterPage` | New user registration |
| `/auth/github/callback` | `GitHubCallback` | GitHub OAuth callback handler |

### Protected Routes
Routes requiring authentication (wrapped in `ProtectedRoute`):

| Path | Component | Purpose |
|------|-----------|---------|
| `/dashboard` | `DashboardPage` | Main user dashboard |
| `/repositories` | `RepositoriesPage` | Repository management |
| `/documentation` | `DocumentationPage` | Documentation listing |
| `/documentation/:repositoryId` | `DocumentationViewPage` | View specific documentation |
| `/billing` | `BillingPage` | Subscription management |
| `/settings` | `SettingsPage` | User settings |

## Route Configuration

### App.tsx Route Setup
```tsx
<Router>
  <Routes>
    {/* Public Routes */}
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/auth/github/callback" element={<GitHubCallback />} />
    
    {/* Protected Routes */}
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <Layout>
            <DashboardPage />
          </Layout>
        </ProtectedRoute>
      }
    />
    {/* ... other protected routes ... */}
  </Routes>
</Router>
```

## Page Components

### 1. Landing Page (`/`)

**Purpose**: Convert visitors to users

**Key Features**:
- Hero section with value proposition
- Feature highlights
- Pricing information
- Call-to-action buttons

**User Actions**:
- Navigate to login/register
- Learn about features
- View pricing

**Code Structure**:
```tsx
export function LandingPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <Footer />
    </div>
  )
}
```

### 2. Login Page (`/login`)

**Purpose**: Authenticate existing users

**Key Features**:
- Email/password form
- Show/hide password toggle
- Remember me option
- GitHub OAuth option
- Link to registration

**State Management**:
```tsx
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [showPassword, setShowPassword] = useState(false)
const { login, isLoading, error } = useAuthStore()
```

**User Flow**:
1. Enter credentials
2. Submit form
3. Redirect to dashboard on success
4. Show error on failure

### 3. Register Page (`/register`)

**Purpose**: Create new user accounts

**Key Features**:
- Registration form with validation
- Password confirmation
- Terms of service agreement
- Link to login

**Validation**:
- Email format validation
- Password strength requirements
- Password match verification
- Required field validation

**Integration**:
```tsx
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault()
  if (password !== confirmPassword) {
    setError('Passwords do not match')
    return
  }
  await register({ email, password, fullName })
}
```

### 4. GitHub Callback (`/auth/github/callback`)

**Purpose**: Handle GitHub OAuth flow completion

**Key Features**:
- Process OAuth code
- Exchange code for tokens
- Update user authentication
- Handle errors gracefully

**Flow States**:
1. Processing - Exchange code
2. Success - Redirect to dashboard
3. Error - Show error message

**Implementation**:
```tsx
useEffect(() => {
  const code = searchParams.get('code')
  if (code) {
    exchangeCodeForToken(code)
  }
}, [])
```

### 5. Dashboard Page (`/dashboard`)

**Purpose**: Central hub for authenticated users

**Key Sections**:
- GitHub connection status
- Repository statistics
- Quick actions
- Recent activity

**Components Used**:
- `GitHubIntegration` - Connection management
- `RepositoryManager` - Repo selection modal
- Stats cards with metrics

**Data Fetching**:
```tsx
useEffect(() => {
  checkInstallationStatus()
  loadRepositoryCount()
}, [])
```

### 6. Repositories Page (`/repositories`)

**Purpose**: Manage connected repositories

**Key Features**:
- Repository grid/list view
- Search and filter
- Documentation generation
- Progress tracking

**State Management**:
```tsx
const [repositories, setRepositories] = useState<Repository[]>([])
const [searchTerm, setSearchTerm] = useState('')
const [filterLanguage, setFilterLanguage] = useState('')
const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({})
```

**Repository Card Features**:
- Repository metadata
- Language badge
- Documentation status
- Action buttons

### 7. Documentation Page (`/documentation`)

**Purpose**: Browse all generated documentation

**Key Features**:
- Documentation cards
- Search functionality
- Sort options
- Navigation to viewer

**Data Structure**:
```tsx
interface DocumentationItem {
  id: string
  repositoryName: string
  language: string
  lastUpdated: Date
  coverage: number
}
```

### 8. Documentation View Page (`/documentation/:repositoryId`)

**Purpose**: View and browse documentation

**Key Features**:
- File tree navigation
- Markdown rendering
- Search within docs
- Download options
- Regeneration

**Components**:
- `MultiPageDocumentationView` - Main viewer
- `DocumentationProgressModal` - Regeneration progress

**URL Parameters**:
- `repositoryId` - Repository identifier
- Optional query params for file selection

### 9. Billing Page (`/billing`)

**Purpose**: Subscription and payment management

**Key Sections**:
- Current plan details
- Usage statistics
- Payment methods
- Billing history
- Plan upgrade options

**Features** (Placeholder):
- Plan comparison
- Usage metrics
- Invoice downloads
- Payment method management

### 10. Settings Page (`/settings`)

**Purpose**: User preferences and account management

**Key Sections**:
1. **Profile Settings**
   - Name and email
   - Avatar upload
   - Bio/description

2. **Security Settings**
   - Password change
   - Two-factor authentication
   - Active sessions

3. **Notifications**
   - Email preferences
   - In-app notifications
   - Webhook configuration

4. **API Keys**
   - Generate keys
   - Manage permissions
   - Usage tracking

5. **Danger Zone**
   - Export data
   - Delete account

## Navigation Patterns

### Sidebar Navigation (Layout Component)
```tsx
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Repositories', href: '/repositories', icon: GitBranch },
  { name: 'Documentation', href: '/documentation', icon: FileText },
  { name: 'Billing', href: '/billing', icon: CreditCard },
  { name: 'Settings', href: '/settings', icon: Settings },
]
```

### Programmatic Navigation
```tsx
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()

// After successful action
navigate('/dashboard')

// With state
navigate('/documentation', { state: { highlightNew: true } })
```

## Route Protection

### ProtectedRoute Component
```tsx
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}
```

### Authentication Check
- Checks Zustand store for auth status
- Redirects to login if not authenticated
- Preserves intended destination

## User Flows

### 1. New User Onboarding
```
Landing → Register → Dashboard → Connect GitHub → Select Repos → Generate Docs
```

### 2. Returning User
```
Landing → Login → Dashboard → View/Manage Documentation
```

### 3. GitHub Integration
```
Dashboard → Connect GitHub → OAuth Flow → Callback → Repository Selection
```

### 4. Documentation Generation
```
Repositories → Select Repo → Generate → Progress Modal → View Documentation
```

## Best Practices

### 1. **Route Organization**
- Logical grouping of routes
- Consistent naming conventions
- Clear URL structure

### 2. **Code Splitting**
- Lazy load heavy pages
- Route-based splitting
- Optimize bundle size

### 3. **Error Boundaries**
- Page-level error handling
- Graceful error recovery
- User-friendly error pages

### 4. **Loading States**
- Skeleton screens
- Progress indicators
- Smooth transitions

### 5. **SEO Considerations**
- Meaningful URLs
- Meta tags for public pages
- Sitemap generation

## Future Enhancements

1. **Breadcrumb Navigation**
   - Auto-generated breadcrumbs
   - Hierarchical navigation

2. **Route Animations**
   - Page transitions
   - Smooth navigation

3. **Deep Linking**
   - Shareable documentation URLs
   - State preservation

4. **Analytics Integration**
   - Page view tracking
   - User flow analysis
   - Performance monitoring