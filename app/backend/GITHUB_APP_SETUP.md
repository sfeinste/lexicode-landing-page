# GitHub App Integration Setup

## Overview
This guide helps you complete the GitHub App integration for Lexicode using the implemented backend services.

## Prerequisites
- GitHub App created with callback URL: `https://smee.io/KQg6S8n37xssNQtE/github`
- Supabase database running
- Backend environment configured

## Setup Steps

### 1. Run Database Migration
Execute the GitHub integration migration in your Supabase database:

```sql
-- Run the migration file: migrations/001_github_integration.sql
-- This creates the necessary tables: github_installations, repository_access, repository_access_audit, repository_sync_status
```

### 2. Configure Environment Variables
Update your `.env` file with your GitHub App credentials:

```env
# GitHub App Configuration
GITHUB_APP_ID=your_app_id_here
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nyour_private_key_here\n-----END RSA PRIVATE KEY-----"
GITHUB_APP_WEBHOOK_SECRET=your_webhook_secret_here
GITHUB_APP_CALLBACK_URL=https://smee.io/KQg6S8n37xssNQtE/github
```

### 3. GitHub App Settings
Configure your GitHub App with these settings:

**App Name**: Lexicode Documentation Generator

**Permissions**:
- Contents: Read
- Metadata: Read
- Pull requests: Read (optional)

**Webhook Events**:
- installation
- installation_repositories  
- push
- pull_request

**Webhook URL**: `https://smee.io/KQg6S8n37xssNQtE/github` (redirects to your localhost:3001)

### 4. API Endpoints Available

**Installation Management**:
- `GET /api/v1/auth/github-app/install` - Get installation URL
- `GET /api/v1/auth/github-app/callback` - Handle installation callback
- `GET /api/v1/auth/github-app/installations` - Get user installations
- `GET /api/v1/auth/github-app/repositories` - Get accessible repositories

**Webhook Handling**:
- `POST /api/v1/auth/github-app/webhook` - GitHub webhook endpoint

### 5. Testing the Integration

1. **Start the backend server**:
   ```bash
   cd app/backend
   npm run dev
   ```

2. **Start smee client** (in another terminal):
   ```bash
   npx smee -u https://smee.io/KQg6S8n37xssNQtE/github -t http://localhost:3001/api/v1/auth/github-app/webhook
   ```

3. **Test installation flow**:
   ```bash
   # Get installation URL (requires authentication)
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        http://localhost:3001/api/v1/auth/github-app/install
   
   # Check installations
   curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
        http://localhost:3001/api/v1/auth/github-app/installations
   ```

### 6. Installation Flow

1. User clicks "Connect GitHub" in your frontend
2. Frontend calls `/api/v1/auth/github-app/install` to get installation URL
3. User is redirected to GitHub to install the app
4. GitHub sends webhook events to your backend
5. Backend processes installation and stores repository access
6. User can now access their repositories through the API

## Troubleshooting

### Common Issues

1. **JWT Generation Fails**: 
   - Check that private key is properly formatted in environment variables
   - Ensure newlines are properly escaped (\\n)

2. **Webhook Signature Verification Fails**:
   - Verify webhook secret matches between GitHub App and environment
   - Check that raw body is being captured properly

3. **Database Connection Issues**:
   - Run the migration script in Supabase
   - Verify Supabase credentials in environment

4. **Rate Limiting**:
   - GitHub Apps have higher rate limits than OAuth apps
   - Check rate limit headers in API responses

### Logs to Monitor

- Installation events: Look for "Processing installation event" logs
- Token generation: Check for JWT and installation token generation logs
- Webhook processing: Monitor webhook event processing logs
- Database operations: Watch for Supabase query logs

## Next Steps

1. **Frontend Integration**: Update frontend to use new GitHub App endpoints
2. **Repository Sync**: Implement repository content synchronization
3. **Documentation Generation**: Connect repository access to AI documentation generation
4. **Webhook Processing**: Enhance webhook handlers for real-time updates
5. **Error Handling**: Add comprehensive error handling and retry logic