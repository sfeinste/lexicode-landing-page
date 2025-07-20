# Component Architecture

## Overview

The component architecture follows React best practices with a focus on composition, reusability, and single responsibility. Components are organized by feature and complexity level.

## Component Categories

### 1. Layout Components

#### **Layout.tsx**
- **Purpose**: Main application wrapper providing consistent navigation and header
- **Props**: `{ children: ReactNode }`
- **Key Features**:
  - Persistent sidebar navigation
  - User profile display
  - Logout functionality
  - Active route highlighting
- **Used By**: All authenticated pages

#### **ProtectedRoute.tsx**
- **Purpose**: Authentication guard for protected pages
- **Props**: `{ children: ReactNode }`
- **Key Features**:
  - Checks authentication status
  - Redirects to login if unauthorized
  - Transparent wrapper when authorized
- **Used By**: App.tsx for all protected routes

### 2. Documentation Components

#### **MultiPageDocumentationView.tsx**
- **Purpose**: Primary documentation viewer with file navigation
- **Props**:
  ```typescript
  {
    repositoryId: string
    repositoryName: string
    onRegenerate?: () => void
  }
  ```
- **Key Features**:
  - Split-pane layout with file tree
  - Markdown rendering with syntax highlighting
  - Search functionality
  - Download and regenerate actions
  - Responsive mobile layout
- **Child Components**:
  - FileTree
  - FileTreeSearch
  - DocumentationBreadcrumb
  - DocumentationQuickActions

#### **DocumentationBreadcrumb.tsx**
- **Purpose**: Hierarchical navigation for documentation
- **Props**:
  ```typescript
  {
    repositoryName: string
    filePath?: string
    onNavigate?: (path?: string) => void
  }
  ```
- **Key Features**:
  - Visual path representation
  - Click-to-navigate functionality
  - Icon indicators

#### **DocumentationQuickActions.tsx**
- **Purpose**: Action toolbar for documentation operations
- **Props**:
  ```typescript
  {
    onDownload: () => void
    onRegenerate: () => void
    onSearch?: () => void
    onShare?: () => void
    onExportAll?: () => void
    documentationUrl?: string
    isRegenerating?: boolean
  }
  ```
- **Key Features**:
  - Download current/all documentation
  - Copy shareable URL
  - Trigger regeneration
  - Extensible action system

### 3. File Navigation Components

#### **FileTree.tsx**
- **Purpose**: Hierarchical file browser
- **Props**:
  ```typescript
  {
    nodes: FileTreeNode[]
    onFileSelect: (path: string) => void
    selectedPath?: string
  }
  ```
- **Key Features**:
  - Recursive tree rendering
  - Expand/collapse folders
  - File type icons
  - Documentation status indicators
  - Keyboard navigation support

#### **FileTreeSearch.tsx**
- **Purpose**: Search input for file filtering
- **Props**:
  ```typescript
  {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }
  ```
- **Key Features**:
  - Real-time search
  - Clear button
  - Keyboard shortcuts

### 4. GitHub Integration Components

#### **GitHubIntegration.tsx**
- **Purpose**: GitHub connection status and setup
- **Props**:
  ```typescript
  {
    onInstallationComplete?: () => void
  }
  ```
- **Key Features**:
  - Connection status display
  - Installation flow initiation
  - Repository count
  - Error handling
- **Uses**: useGitHub hook

#### **RepositoryManager.tsx**
- **Purpose**: Modal for managing repository access
- **Props**:
  ```typescript
  {
    onClose: () => void
  }
  ```
- **Key Features**:
  - Repository list with search
  - Toggle access permissions
  - Language filtering
  - Batch operations
  - Save/cancel functionality

### 5. Progress Components

#### **GenerationProgress.tsx**
- **Purpose**: Documentation generation progress indicator
- **Props**:
  ```typescript
  {
    totalFiles: number
    processedFiles: number
    status: 'pending' | 'processing' | 'completed' | 'failed'
    estimatedTimeRemaining?: number
  }
  ```
- **Key Features**:
  - Visual progress bar
  - File count display
  - Time estimation
  - Status-based styling

#### **DocumentationProgressModal.tsx**
- **Purpose**: Modal wrapper for generation progress
- **Props**:
  ```typescript
  {
    isOpen: boolean
    onClose: () => void
    progress: JobProgress | null
    repositoryName: string
  }
  ```
- **Key Features**:
  - Modal overlay
  - Progress tracking
  - Error display
  - Auto-close on completion

### 6. Loading Components

#### **DocumentationSkeleton.tsx**
- **Purpose**: Loading placeholders
- **Exports**:
  - `DocumentationSkeleton`: Content skeleton
  - `FileTreeSkeleton`: File tree skeleton
- **Key Features**:
  - Animated loading effect
  - Layout preservation
  - Multiple skeleton variants

### 7. Utility Components

#### **HelpTooltip.tsx**
- **Purpose**: Help tooltips and tips section
- **Components**:
  - `HelpTooltip`: Individual tooltip
  - `HelpSection`: Tips collection
- **Props** (HelpTooltip):
  ```typescript
  {
    title: string
    content: string | React.ReactNode
    position?: 'top' | 'bottom' | 'left' | 'right'
  }
  ```
- **Key Features**:
  - Click-triggered tooltips
  - Positioned arrows
  - Rich content support

## Component Relationships

### Hierarchy Diagram
```
App
├── ProtectedRoute
│   └── Layout
│       └── Page Components
│           ├── Dashboard
│           │   ├── GitHubIntegration
│           │   └── Stats Cards
│           ├── Repositories
│           │   ├── RepositoryManager (modal)
│           │   └── DocumentationProgressModal
│           └── DocumentationView
│               └── MultiPageDocumentationView
│                   ├── FileTree
│                   ├── FileTreeSearch
│                   ├── DocumentationBreadcrumb
│                   ├── DocumentationQuickActions
│                   └── DocumentationSkeleton
└── Public Pages
    ├── Landing
    ├── Login
    └── Register
```

## Design Patterns

### 1. **Composition Pattern**
Components are built using composition rather than inheritance:
```tsx
<Layout>
  <MultiPageDocumentationView>
    <FileTree />
    <DocumentationContent />
  </MultiPageDocumentationView>
</Layout>
```

### 2. **Props Interface Pattern**
All components define explicit TypeScript interfaces:
```tsx
interface ComponentProps {
  required: string
  optional?: number
  callback: (value: string) => void
}
```

### 3. **Container/Presenter Pattern**
- Container components handle data and logic
- Presenter components handle UI rendering
- Clear separation of concerns

### 4. **Controlled Component Pattern**
Form inputs and interactive elements are controlled:
```tsx
<FileTreeSearch
  value={searchTerm}
  onChange={setSearchTerm}
/>
```

## Best Practices

### 1. **Single Responsibility**
Each component has one clear purpose and doesn't try to do too much.

### 2. **Props Validation**
TypeScript interfaces ensure type safety at compile time.

### 3. **Consistent Naming**
- Components: PascalCase
- Props: camelCase
- Event handlers: `onAction` pattern

### 4. **Accessibility**
- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support

### 5. **Performance**
- React.memo for expensive components
- useCallback for stable function references
- Lazy loading for heavy components

## Component Communication

### 1. **Props Down**
Data flows from parent to child via props.

### 2. **Events Up**
Child components communicate with parents via callback props.

### 3. **Global State**
Shared state managed by Zustand stores.

### 4. **Custom Hooks**
Complex logic encapsulated in reusable hooks.

## Testing Strategy

### Unit Testing
- Test individual components in isolation
- Mock dependencies and API calls
- Focus on user interactions

### Integration Testing
- Test component interactions
- Verify data flow
- Test error scenarios

### Visual Testing
- Snapshot testing for UI consistency
- Storybook for component documentation