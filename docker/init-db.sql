-- LodeAI Database Initialization Script

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS lodeai;

-- Use the database
\c lodeai;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'recruiter',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'fullstack',
    difficulty TEXT DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create assignment_details table
CREATE TABLE IF NOT EXISTS assignment_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID REFERENCES users(id),
    candidate_email TEXT NOT NULL,
    job_description TEXT,
    job_title TEXT,
    assigned_at TIMESTAMP DEFAULT NOW(),
    status TEXT DEFAULT 'pending',
    test_results JSONB,
    score INTEGER,
    completed_at TIMESTAMP
);

-- Create test_cases table
CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES assignments(id),
    name TEXT NOT NULL,
    description TEXT,
    input_data JSONB,
    expected_output JSONB,
    test_type TEXT DEFAULT 'unit',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create assessment_sessions table
CREATE TABLE IF NOT EXISTS assessment_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_email TEXT NOT NULL,
    assignment_id UUID REFERENCES assignments(id),
    container_id TEXT,
    status TEXT DEFAULT 'active',
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    logs JSONB
);

-- Insert sample data
INSERT INTO users (email, name, role) VALUES 
('recruiter@lodeai.com', 'LodeAI Recruiter', 'recruiter'),
('admin@lodeai.com', 'LodeAI Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample assignments
INSERT INTO assignments (recruiter_id, title, description, type, difficulty) VALUES 
(
    (SELECT id FROM users WHERE email = 'recruiter@lodeai.com'),
    'Full-Stack Web Application',
    'Build a complete web application with frontend and backend',
    'fullstack',
    'medium'
),
(
    (SELECT id FROM users WHERE email = 'recruiter@lodeai.com'),
    'Data Science Analysis',
    'Analyze dataset and create visualizations',
    'data-science',
    'hard'
),
(
    (SELECT id FROM users WHERE email = 'recruiter@lodeai.com'),
    'Frontend React Application',
    'Build a responsive React application',
    'frontend',
    'easy'
)
ON CONFLICT DO NOTHING;

-- Insert sample assignment details
INSERT INTO assignment_details (recruiter_id, candidate_email, job_description, job_title) VALUES 
(
    (SELECT id FROM users WHERE email = 'recruiter@lodeai.com'),
    'ujjwalreddyks@gmail.com',
    'Responsibilities:
Assist with assembling, cleaning, and organizing large datasets to prepare them for analysis.
Support team members in merging and parsing data to uncover trends and patterns.
Learn to apply statistical and machine learning techniques under the guidance of senior data scientists.
Help document model code, track results, and contribute to validating predictive models.
Assist in creating attributes and rules from raw data to support analytic projects.
Contribute to data visualization efforts to communicate findings.
Participate in preparing responses to client inquiries regarding data, score calculations, or analytic outputs.
Document work clearly and practice presenting results in a team setting.

Requirements:
Hold a bachelor''s in data science/analytics, Computer Science, Mathematics, or other degrees in fields like Engineering, Economics, and Business.
Coursework or project experience in Python or R; familiarity with SQL is a plus
Interest in data analysis, predictive modeling, and machine learning.
Exposure to data visualization tools (e.g., Tableau, Power BI, Matplotlib, Seaborn) is desirable.
Strong problem-solving skills with a willingness to learn and adapt.
Ability to communicate ideas clearly and work collaboratively with others',
    'Data Science Intern Position'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assignment_details_candidate_email ON assignment_details(candidate_email);
CREATE INDEX IF NOT EXISTS idx_assignment_details_status ON assignment_details(status);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_candidate_email ON assessment_sessions(candidate_email);
CREATE INDEX IF NOT EXISTS idx_assessment_sessions_status ON assessment_sessions(status);

-- Create functions for common operations
CREATE OR REPLACE FUNCTION get_candidate_assignment(candidate_email_param TEXT)
RETURNS TABLE (
    id UUID,
    candidate_email TEXT,
    job_description TEXT,
    job_title TEXT,
    assigned_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ad.id,
        ad.candidate_email,
        ad.job_description,
        ad.job_title,
        ad.assigned_at
    FROM assignment_details ad
    WHERE ad.candidate_email = candidate_email_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to update test results
CREATE OR REPLACE FUNCTION update_test_results(
    candidate_email_param TEXT,
    test_results_param JSONB,
    score_param INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE assignment_details 
    SET 
        test_results = test_results_param,
        score = score_param,
        status = 'completed',
        completed_at = NOW()
    WHERE candidate_email = candidate_email_param;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
