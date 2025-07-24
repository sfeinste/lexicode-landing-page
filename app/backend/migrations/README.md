# Database Migrations

This directory contains SQL migration files for the backend database schema.

## Migration Files

1. **001_github_integration.sql** - Creates tables for GitHub integration (installations, repository access)
2. **002_documentation_tables.sql** - Creates core documentation tables (documentation, documentation_generations)
3. **003_documentation_files_table.sql** - Creates tables for file-based documentation storage
4. **004_add_job_id_to_generations.sql** - Adds job_id column for async queue tracking

## Running Migrations

To run migrations in Supabase:

1. Go to the SQL Editor in your Supabase dashboard
2. Copy and paste the migration SQL
3. Execute the query

Or use the Supabase CLI:

```bash
supabase db push
```

## Important Notes

- Migrations should be run in order
- The `job_id` column (migration 004) is required for the async file processing architecture
- All migrations are idempotent (can be run multiple times safely)