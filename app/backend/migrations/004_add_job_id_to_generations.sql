-- Add job_id column to documentation_generations table
-- This column is used to track jobs across the async queue system

ALTER TABLE documentation_generations 
ADD COLUMN IF NOT EXISTS job_id UUID;

-- Add index for efficient job lookups
CREATE INDEX IF NOT EXISTS idx_documentation_generations_job_id 
ON documentation_generations(job_id);

-- Add comment for the new column
COMMENT ON COLUMN documentation_generations.job_id IS 'Unique identifier for the job in the queue system, used for tracking async processing';

-- Update existing records to have a job_id (optional, for backward compatibility)
-- This generates a new UUID for any existing records that don't have a job_id
UPDATE documentation_generations 
SET job_id = uuid_generate_v4() 
WHERE job_id IS NULL;