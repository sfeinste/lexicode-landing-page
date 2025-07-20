# API Reference

## Base URL
```
https://api.lexicode.app/api/v1
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Endpoints

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "username": "johndoe",
  "fullName": "John Doe"
}

Response: 201 Created
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "fullName": "John Doe",
    "subscriptionTier": "free"
  },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}

Response: 200 OK
{
  "user": { ... },
  "accessToken": "jwt_token",
  "refreshToken": "refresh_token"
}
```

#### Refresh Token
```http
POST /auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "refresh_token"
}

Response: 200 OK
{
  "accessToken": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <access_token>

Response: 200 OK
{
  "id": "uuid",
  "email": "user@example.com",
  "username": "johndoe",
  "fullName": "John Doe",
  "avatarUrl": "https://...",
  "subscriptionTier": "premium"
}
```

#### Update Profile
```http
PUT /auth/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "username": "newusername",
  "fullName": "New Name",
  "avatarUrl": "https://..."
}

Response: 200 OK
{
  "user": { ... }
}
```

### GitHub App Integration

#### Initiate Installation
```http
GET /auth/github-app/install?redirect_url=https://app.lexicode.app/callback

Response: 302 Redirect
Location: https://github.com/apps/lexicode/installations/new
```

#### Exchange OAuth Code
```http
POST /auth/github-app/oauth/exchange
Content-Type: application/json

{
  "code": "oauth_code",
  "installationId": 123456
}

Response: 200 OK
{
  "success": true,
  "user": { ... }
}
```

#### List Installations
```http
GET /auth/github-app/installations
Authorization: Bearer <access_token>

Response: 200 OK
[
  {
    "id": "uuid",
    "installationId": 123456,
    "accountLogin": "organization-name",
    "accountType": "Organization",
    "repositorySelection": "selected",
    "permissions": {
      "contents": "read",
      "metadata": "read"
    }
  }
]
```

#### List Repositories
```http
GET /auth/github-app/repositories
Authorization: Bearer <access_token>

Response: 200 OK
[
  {
    "id": 789012,
    "name": "repository-name",
    "full_name": "owner/repository-name",
    "private": false,
    "description": "Repository description",
    "language": "TypeScript",
    "default_branch": "main"
  }
]
```

### Documentation

#### Generate Documentation
```http
POST /documentation/generate/:repositoryId
Authorization: Bearer <access_token>

Response: 202 Accepted
{
  "message": "Documentation generation started",
  "jobId": "job_uuid"
}
```

#### Get Documentation
```http
GET /documentation/:repositoryId
Authorization: Bearer <access_token>

Response: 200 OK
{
  "id": "uuid",
  "repositoryId": 123456,
  "content": "# Repository Documentation\n...",
  "version": 1,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### Track Progress
```http
GET /documentation/progress/:jobId
Authorization: Bearer <access_token>

Response: 200 OK
{
  "jobId": "job_uuid",
  "status": "in_progress",
  "progress": 45,
  "message": "Processing file: src/index.ts",
  "filesProcessed": 15,
  "totalFiles": 33,
  "currentFile": "src/index.ts"
}
```

#### List Documentation Files
```http
GET /documentation/:repositoryId/files
Authorization: Bearer <access_token>

Response: 200 OK
[
  {
    "id": "uuid",
    "filePath": "src/index.ts",
    "summary": "Main application entry point",
    "language": "typescript",
    "linesOfCode": 150
  }
]
```

#### Get File Documentation
```http
GET /documentation/:repositoryId/files/src/index.ts
Authorization: Bearer <access_token>

Response: 200 OK
{
  "id": "uuid",
  "filePath": "src/index.ts",
  "content": "# src/index.ts\n\n## Overview\n...",
  "summary": "Main application entry point",
  "language": "typescript",
  "metadata": { ... }
}
```

### Repository Management

#### List Repositories
```http
GET /repositories
Authorization: Bearer <access_token>

Response: 501 Not Implemented
```

#### Sync Repositories
```http
POST /repositories/sync
Authorization: Bearer <access_token>

Response: 501 Not Implemented
```

### Billing

#### Get Subscription
```http
GET /billing/subscription
Authorization: Bearer <access_token>

Response: 501 Not Implemented
```

#### Get Usage
```http
GET /billing/usage?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <access_token>

Response: 501 Not Implemented
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- Documentation generation: 10 requests per hour
- API endpoints: 100 requests per minute

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Webhooks

### GitHub Webhook
```http
POST /auth/github-app/webhook
X-Hub-Signature-256: sha256=...
Content-Type: application/json

{
  "action": "created",
  "installation": { ... },
  "repositories": [ ... ]
}
```

### Stripe Webhook
```http
POST /billing/webhook
Stripe-Signature: t=...,v1=...
Content-Type: application/json

{
  "type": "invoice.payment_succeeded",
  "data": { ... }
}
```