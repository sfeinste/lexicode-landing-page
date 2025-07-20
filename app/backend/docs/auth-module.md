# Authentication Module Documentation

## Overview

The Auth module provides comprehensive authentication and authorization services including email/password authentication, GitHub OAuth, and GitHub App integration.

## Architecture

### Controllers

#### AuthController
Handles user authentication and profile management.

**Endpoints:**
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh-token` - Token refresh
- `GET /auth/me` - Get current user (protected)
- `PUT /auth/profile` - Update profile (protected)
- `POST /auth/logout` - Logout (protected)
- `DELETE /auth/account` - Delete account (protected)

#### GitHubAppController
Manages GitHub App installations and repository access.

**Endpoints:**
- `GET /auth/github-app/install` - Initiate installation
- `POST /auth/github-app/oauth/exchange` - Exchange OAuth code
- `GET /auth/github-app/callback` - Installation callback
- `GET /auth/github-app/installations` - List installations (protected)
- `GET /auth/github-app/repositories` - List repositories (protected)
- `POST /auth/github-app/webhook` - GitHub webhooks

### Services

#### AuthService
Core authentication service with Supabase integration.

**Key Methods:**
```typescript
register(userData: RegisterData): Promise<AuthResult>
login(email: string, password: string): Promise<AuthResult>
refreshToken(refreshToken: string): Promise<AuthResult>
validateToken(token: string): Promise<User>
findUserById(userId: string): Promise<User>
updateUser(userId: string, data: UpdateUserData): Promise<User>
deleteUser(userId: string): Promise<void>
```

#### GitHubService
Handles GitHub OAuth and App interactions.

**Key Methods:**
```typescript
getGitHubAppInstallUrl(state?: string): string
getUserRepositories(userId: string): Promise<GitHubRepository[]>
getRepositoryContent(params: RepoContentParams): Promise<any>
createWebhook(params: WebhookParams): Promise<void>
verifyWebhookSignature(payload: string, signature: string): boolean
```

#### GitHubAppService
Specialized service for GitHub App functionality.

**Key Methods:**
```typescript
generateAppJWT(): string
generateInstallationToken(installationId: number): Promise<string>
getInstallationRepositories(token: string): Promise<GitHubRepository[]>
handleInstallationCallback(params: CallbackParams): Promise<void>
encryptToken(token: string): string
decryptToken(encrypted: string): string
```

### Middleware

#### authMiddleware
Validates Bearer tokens and attaches user to request.

```typescript
interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}
```

#### optionalAuthMiddleware
Same as authMiddleware but allows unauthenticated requests.

## Data Models

### User
```typescript
interface User {
  id: string;
  email: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  githubProfile?: any;
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  subscriptionTier: string;
}
```

### AuthResult
```typescript
interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}
```

### GitHubAppInstallation
```typescript
interface GitHubAppInstallation {
  id: string;
  userId: string;
  installationId: number;
  accountLogin: string;
  accountType: string;
  permissions: Record<string, string>;
  repositorySelection: string;
  createdAt: Date;
}
```

## Authentication Flows

### Email/Password Flow
1. User registers with email/password
2. Supabase creates user account
3. Access and refresh tokens returned
4. Tokens used for subsequent requests

### GitHub App Installation Flow
1. User initiates installation via `/auth/github-app/install`
2. Redirected to GitHub App installation page
3. User selects repositories and permissions
4. GitHub redirects with installation_id
5. OAuth code exchange (if user authorization enabled)
6. Installation stored in database
7. Webhooks configured for repository events

### Token Refresh Flow
1. Client sends refresh token to `/auth/refresh-token`
2. Supabase validates and issues new tokens
3. New access/refresh tokens returned

## Security Considerations

- **Token Security**: JWTs with short expiration times
- **Refresh Tokens**: Secure refresh token rotation
- **Password Security**: Handled by Supabase with bcrypt
- **GitHub Tokens**: Encrypted before storage
- **Webhook Validation**: HMAC signature verification
- **Rate Limiting**: Applied to authentication endpoints

## Integration Points

- **Supabase**: Primary authentication provider
- **GitHub API**: OAuth and App integration
- **Database**: User profiles and GitHub installations
- **Billing Module**: User subscription tier management
- **Repository Module**: Access control for repositories