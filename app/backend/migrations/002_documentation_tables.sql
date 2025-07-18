-- Documentation storage table
CREATE TABLE IF NOT EXISTS documentation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repository_access(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users(id) in Supabase
    content TEXT NOT NULL,
    generation_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(repository_id, user_id)
);

-- Documentation generation history table
CREATE TABLE IF NOT EXISTS documentation_generations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    repository_id UUID NOT NULL REFERENCES repository_access(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References auth.users(id) in Supabase
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'manual', -- manual, webhook, scheduled
    input_data JSONB,
    output_data JSONB,
    error_data JSONB,
    files_processed INTEGER DEFAULT 0,
    files_failed INTEGER DEFAULT 0,
    processing_time_seconds NUMERIC,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_documentation_repository_id ON documentation(repository_id);
CREATE INDEX idx_documentation_user_id ON documentation(user_id);
CREATE INDEX idx_documentation_generations_repository_id ON documentation_generations(repository_id);
CREATE INDEX idx_documentation_generations_user_id ON documentation_generations(user_id);
CREATE INDEX idx_documentation_generations_status ON documentation_generations(status);
CREATE INDEX idx_documentation_generations_created_at ON documentation_generations(created_at DESC);

-- Add foreign key for generation_id in documentation table
ALTER TABLE documentation 
    ADD CONSTRAINT fk_documentation_generation 
    FOREIGN KEY (generation_id) 
    REFERENCES documentation_generations(id) 
    ON DELETE SET NULL;

-- Add updated_at trigger for documentation table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documentation_updated_at 
    BEFORE UPDATE ON documentation
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment descriptions
COMMENT ON TABLE documentation IS 'Stores generated documentation content for repositories';
COMMENT ON TABLE documentation_generations IS 'Tracks documentation generation history and status';

COMMENT ON COLUMN documentation.repository_id IS 'Reference to the repository in repository_access table';
COMMENT ON COLUMN documentation.content IS 'The generated documentation content in markdown format';
COMMENT ON COLUMN documentation.generation_id IS 'Reference to the generation record that created this documentation';

COMMENT ON COLUMN documentation_generations.status IS 'Current status of the generation job';
COMMENT ON COLUMN documentation_generations.trigger_type IS 'How the generation was triggered';
COMMENT ON COLUMN documentation_generations.input_data IS 'JSON data about the input (files count, config, etc)';
COMMENT ON COLUMN documentation_generations.output_data IS 'JSON data about the output (tokens used, cost, etc)';
COMMENT ON COLUMN documentation_generations.error_data IS 'JSON data about any errors that occurred';
COMMENT ON COLUMN documentation_generations.processing_time_seconds IS 'Total time taken to generate documentation';