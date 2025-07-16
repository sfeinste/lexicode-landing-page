# Supabase Setup Instructions

## Required Environment Variables

To complete the Supabase authentication setup, you need to add the following keys to your `.env` file:

### 1. Anon Key (SUPABASE_ANON_KEY)
- Go to your Supabase project dashboard
- Navigate to Settings > API
- Copy the "anon public" key
- Add to .env: `SUPABASE_ANON_KEY=your_anon_key_here`

### 2. Service Role Key (SUPABASE_SERVICE_KEY)
- In the same API settings page
- Copy the "service_role" key (keep this secret!)
- Add to .env: `SUPABASE_SERVICE_KEY=your_service_role_key_here`

### 3. JWT Secret (SUPABASE_JWT_SECRET)
- In Settings > API
- Copy the "JWT Secret"
- Add to .env: `SUPABASE_JWT_SECRET=your_jwt_secret_here`

## Testing the Authentication

Once you have added these keys, you can test the authentication endpoints:

1. Start the server: `npm run dev`
2. Register a new user:
   ```bash
   curl -X POST http://localhost:3001/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"sprucefeinstein@gmail.com","password":"password123","username":"testuser"}'
   ```

3. Login:
   ```bash
   curl -X POST http://localhost:3001/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"sprucefeinstein@gmail.com","password":"password123"}'
   ```

4. Get current user (requires auth token):
   ```bash
   curl http://localhost:3001/api/v1/auth/me \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
   ```

## GitHub OAuth Setup

To enable GitHub authentication:

1. Go to Supabase Dashboard > Authentication > Providers
2. Enable GitHub provider
3. Add your GitHub OAuth App credentials
4. Update the callback URL in your GitHub OAuth app to match Supabase's requirements