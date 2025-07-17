-- GitHub App Integration Tables
-- This migration creates the necessary tables for GitHub App integration

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE github_access_status AS ENUM ('active', 'suspended', 'revoked');
CREATE TYPE github_sync_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');
CREATE TYPE github_audit_action AS ENUM ('granted', 'revoked', 'suspended', 'accessed', 'webhook_created', 'webhook_deleted');

-- GitHub App installations per user
CREATE TABLE github_installations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References auth.users(id) in Supabase
    github_installation_id BIGINT NOT NULL,
    github_account_id BIGINT NOT NULL,
    github_account_login VARCHAR(255) NOT NULL,
    installation_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, github_installation_id)
);

-- Repository access tracking
CREATE TABLE repository_access (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References auth.users(id) in Supabase
    github_installation_id UUID NOT NULL REFERENCES github_installations(id) ON DELETE CASCADE,
    github_repo_id BIGINT NOT NULL,
    repo_full_name VARCHAR(512) NOT NULL,
    repo_name VARCHAR(255) NOT NULL,
    repo_owner VARCHAR(255) NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT false,
    default_branch VARCHAR(255) NOT NULL DEFAULT 'main',
    language VARCHAR(100),
    access_granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_status github_access_status DEFAULT 'active',
    webhook_id BIGINT,
    webhook_secret_encrypted TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, github_repo_id)
);

-- Repository access audit log
CREATE TABLE repository_access_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_access_id UUID NOT NULL REFERENCES repository_access(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users(id) in Supabase
    action github_audit_action NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Repository synchronization tracking
CREATE TABLE repository_sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_access_id UUID NOT NULL REFERENCES repository_access(id) ON DELETE CASCADE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status github_sync_status DEFAULT 'pending',
    sync_error TEXT,
    files_processed INTEGER DEFAULT 0,
    total_files INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(repository_access_id)
);

-- Create indexes for performance
CREATE INDEX idx_github_installations_user_id ON github_installations(user_id);
CREATE INDEX idx_github_installations_github_id ON github_installations(github_installation_id);

CREATE INDEX idx_repository_access_user_id ON repository_access(user_id);
CREATE INDEX idx_repository_access_github_repo_id ON repository_access(github_repo_id);
CREATE INDEX idx_repository_access_status ON repository_access(access_status);
CREATE INDEX idx_repository_access_installation_id ON repository_access(github_installation_id);

CREATE INDEX idx_repository_access_audit_repository_id ON repository_access_audit(repository_access_id);
CREATE INDEX idx_repository_access_audit_user_id ON repository_access_audit(user_id);
CREATE INDEX idx_repository_access_audit_action ON repository_access_audit(action);

CREATE INDEX idx_repository_sync_status_repository_id ON repository_sync_status(repository_access_id);
CREATE INDEX idx_repository_sync_status_status ON repository_sync_status(sync_status);

-- Add RLS policies for security
ALTER TABLE github_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_access_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_sync_status ENABLE ROW LEVEL SECURITY;

-- Policies for github_installations
CREATE POLICY "Users can view their own GitHub installations" ON github_installations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own GitHub installations" ON github_installations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own GitHub installations" ON github_installations
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for repository_access
CREATE POLICY "Users can view their own repository access" ON repository_access
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own repository access" ON repository_access
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own repository access" ON repository_access
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for repository_access_audit (read-only for users)
CREATE POLICY "Users can view their own repository audit logs" ON repository_access_audit
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs" ON repository_access_audit
    FOR INSERT WITH CHECK (true);

-- Policies for repository_sync_status
CREATE POLICY "Users can view their own repository sync status" ON repository_sync_status
    FOR SELECT USING (
        auth.uid() = (
            SELECT user_id FROM repository_access 
            WHERE id = repository_sync_status.repository_access_id
        )
    );

-- Service role can manage sync status
CREATE POLICY "Service role can manage sync status" ON repository_sync_status
    FOR ALL WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_github_installations_updated_at 
    BEFORE UPDATE ON github_installations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repository_access_updated_at 
    BEFORE UPDATE ON repository_access 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repository_sync_status_updated_at 
    BEFORE UPDATE ON repository_sync_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();