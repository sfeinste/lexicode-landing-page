-- Create documentation_files table for file-based documentation
CREATE TABLE IF NOT EXISTS documentation_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repository_access(id) ON DELETE CASCADE,
    generation_id UUID REFERENCES documentation_generations(id) ON DELETE SET NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50),
    language VARCHAR(50),
    lines_of_code INTEGER,
    generated_documentation TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure unique file paths per repository and generation
    UNIQUE(repository_id, generation_id, file_path)
);

-- Add indexes for performance
CREATE INDEX idx_documentation_files_repository_id ON documentation_files(repository_id);
CREATE INDEX idx_documentation_files_generation_id ON documentation_files(generation_id);
CREATE INDEX idx_documentation_files_file_path ON documentation_files(file_path);
CREATE INDEX idx_documentation_files_created_at ON documentation_files(created_at DESC);

-- Enable RLS
ALTER TABLE documentation_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for documentation_files
CREATE POLICY "Users can view their own file documentation" ON documentation_files
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM repository_access
        WHERE repository_access.id = documentation_files.repository_id
        AND repository_access.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own file documentation" ON documentation_files
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM repository_access
        WHERE repository_access.id = documentation_files.repository_id
        AND repository_access.user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own file documentation" ON documentation_files
    FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM repository_access
        WHERE repository_access.id = documentation_files.repository_id
        AND repository_access.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own file documentation" ON documentation_files
    FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM repository_access
        WHERE repository_access.id = documentation_files.repository_id
        AND repository_access.user_id = auth.uid()
    ));

-- Create a summary documentation table for repository overviews
CREATE TABLE IF NOT EXISTS documentation_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id UUID NOT NULL REFERENCES repository_access(id) ON DELETE CASCADE,
    generation_id UUID REFERENCES documentation_generations(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(repository_id, generation_id)
);

-- Add indexes for summaries
CREATE INDEX idx_documentation_summaries_repository_id ON documentation_summaries(repository_id);
CREATE INDEX idx_documentation_summaries_generation_id ON documentation_summaries(generation_id);

-- Enable RLS for summaries
ALTER TABLE documentation_summaries ENABLE ROW LEVEL SECURITY;

-- RLS policies for documentation_summaries
CREATE POLICY "Users can view their own documentation summaries" ON documentation_summaries
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM repository_access
        WHERE repository_access.id = documentation_summaries.repository_id
        AND repository_access.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own documentation summaries" ON documentation_summaries
    FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM repository_access
        WHERE repository_access.id = documentation_summaries.repository_id
        AND repository_access.user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own documentation summaries" ON documentation_summaries
    FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM repository_access
        WHERE repository_access.id = documentation_summaries.repository_id
        AND repository_access.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own documentation summaries" ON documentation_summaries
    FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM repository_access
        WHERE repository_access.id = documentation_summaries.repository_id
        AND repository_access.user_id = auth.uid()
    ));

-- Add comments
COMMENT ON TABLE documentation_files IS 'Stores file-level documentation for repositories';
COMMENT ON COLUMN documentation_files.repository_id IS 'Reference to the repository';
COMMENT ON COLUMN documentation_files.generation_id IS 'Reference to the generation that created this documentation';
COMMENT ON COLUMN documentation_files.file_path IS 'Relative path of the file within the repository';
COMMENT ON COLUMN documentation_files.file_type IS 'Type of file (e.g., component, service, model)';
COMMENT ON COLUMN documentation_files.language IS 'Programming language of the file';
COMMENT ON COLUMN documentation_files.lines_of_code IS 'Number of lines in the file';
COMMENT ON COLUMN documentation_files.generated_documentation IS 'Generated documentation in markdown format';
COMMENT ON COLUMN documentation_files.metadata IS 'Additional metadata like imports, exports, complexity';

COMMENT ON TABLE documentation_summaries IS 'Stores repository-level summary documentation';
COMMENT ON COLUMN documentation_summaries.content IS 'Repository overview and summary documentation';
COMMENT ON COLUMN documentation_summaries.metadata IS 'Additional metadata like total files, languages used, etc.';