-- Create documentation table
CREATE TABLE IF NOT EXISTS public.documentation (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    generation_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(repository_id, user_id)
);

-- Create documentation_generations table for tracking generation history
CREATE TABLE IF NOT EXISTS public.documentation_generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'manual',
    input_data JSONB,
    output_data JSONB,
    error_data JSONB,
    files_processed INTEGER DEFAULT 0,
    files_failed INTEGER DEFAULT 0,
    processing_time_seconds NUMERIC,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_documentation_repository_id ON public.documentation(repository_id);
CREATE INDEX idx_documentation_user_id ON public.documentation(user_id);
CREATE INDEX idx_documentation_generations_repository_id ON public.documentation_generations(repository_id);
CREATE INDEX idx_documentation_generations_user_id ON public.documentation_generations(user_id);
CREATE INDEX idx_documentation_generations_status ON public.documentation_generations(status);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.documentation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentation_generations ENABLE ROW LEVEL SECURITY;

-- Documentation policies
CREATE POLICY "Users can view their own documentation"
    ON public.documentation FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documentation"
    ON public.documentation FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documentation"
    ON public.documentation FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documentation"
    ON public.documentation FOR DELETE
    USING (auth.uid() = user_id);

-- Documentation generations policies
CREATE POLICY "Users can view their own generation history"
    ON public.documentation_generations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generation records"
    ON public.documentation_generations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generation records"
    ON public.documentation_generations FOR UPDATE
    USING (auth.uid() = user_id);

-- Add updated_at trigger for documentation table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documentation_updated_at BEFORE UPDATE
    ON public.documentation
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();