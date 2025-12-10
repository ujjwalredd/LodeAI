-- LodeAI Dashboard Supabase Tables Setup
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security (RLS)
-- This ensures users can only access their own data

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID NOT NULL, -- This will be the authenticated user's ID
    title TEXT NOT NULL,
    job_description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID NOT NULL, -- This will be the authenticated user's ID
    candidate_email TEXT NOT NULL,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_recruiter_id ON jobs(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_recruiter_id ON assignments(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_assignments_candidate_email ON assignments(candidate_email);
CREATE INDEX IF NOT EXISTS idx_assignments_job_id ON assignments(job_id);
CREATE INDEX IF NOT EXISTS idx_assignments_created_at ON assignments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for jobs table
CREATE POLICY "Users can view their own jobs" ON jobs
    FOR SELECT USING (recruiter_id = auth.uid());

CREATE POLICY "Users can insert their own jobs" ON jobs
    FOR INSERT WITH CHECK (recruiter_id = auth.uid());

CREATE POLICY "Users can update their own jobs" ON jobs
    FOR UPDATE USING (recruiter_id = auth.uid());

CREATE POLICY "Users can delete their own jobs" ON jobs
    FOR DELETE USING (recruiter_id = auth.uid());

-- Create RLS policies for assignments table
CREATE POLICY "Users can view their own assignments" ON assignments
    FOR SELECT USING (recruiter_id = auth.uid());

CREATE POLICY "Users can insert their own assignments" ON assignments
    FOR INSERT WITH CHECK (recruiter_id = auth.uid());

CREATE POLICY "Users can update their own assignments" ON assignments
    FOR UPDATE USING (recruiter_id = auth.uid());

CREATE POLICY "Users can delete their own assignments" ON assignments
    FOR DELETE USING (recruiter_id = auth.uid());

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_jobs_updated_at 
    BEFORE UPDATE ON jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at 
    BEFORE UPDATE ON assignments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (if needed)
GRANT ALL ON jobs TO authenticated;
GRANT ALL ON assignments TO authenticated;

-- Optional: Insert sample data for testing
-- Uncomment the following lines if you want sample data

-- INSERT INTO jobs (recruiter_id, title, job_description) VALUES 
-- (
--     'your-user-id-here', -- Replace with actual user ID from Supabase auth
--     'Senior Frontend Developer',
--     'We are looking for a Senior Frontend Developer to join our team. You will be responsible for building responsive web applications using modern technologies.

-- Requirements:
-- - 5+ years of experience with React, Vue, or Angular
-- - Strong knowledge of HTML, CSS, and JavaScript
-- - Experience with responsive design
-- - Knowledge of modern build tools (Webpack, Vite, etc.)
-- - Experience with version control (Git)

-- Your task is to create a modern, responsive web application that demonstrates your skills.'
-- );

-- INSERT INTO assignments (recruiter_id, candidate_email, job_id) VALUES 
-- (
--     'your-user-id-here', -- Replace with actual user ID from Supabase auth
--     'ujjwalreddyks@gmail.com',
--     (SELECT id FROM jobs WHERE title = 'Senior Frontend Developer' LIMIT 1)
-- );
