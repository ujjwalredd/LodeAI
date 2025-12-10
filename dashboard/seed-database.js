const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sgoplnmetluhnqiwigxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb3Bsbm1ldGx1aG5xaXdpZ3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjI0NTUsImV4cCI6MjA3MzY5ODQ1NX0.Rd9b2df0ME8zbNGFsJqH1xoRxW1NW8ch-lBhlRk8h6w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');
    
    // Create a recruiter user first
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: 'recruiter-1',
          email: 'recruiter@lodeai.com',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (userError && !userError.message.includes('duplicate')) {
      console.error('Error creating user:', userError);
      return;
    }
    
    console.log('✅ User created:', user?.email || 'User already exists');

    // Create a job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert([
        {
          id: 'job-1',
          recruiter_id: 'recruiter-1',
          title: 'Senior Frontend Developer',
          job_description: 'We are looking for a Senior Frontend Developer to join our team. You will be responsible for building responsive web applications using modern technologies.\n\nRequirements:\n- 5+ years of experience with React, Vue, or Angular\n- Strong knowledge of HTML, CSS, and JavaScript\n- Experience with responsive design\n- Knowledge of modern build tools (Webpack, Vite, etc.)\n- Experience with version control (Git)\n\nYour task is to create a modern, responsive web application that demonstrates your skills.',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (jobError && !jobError.message.includes('duplicate')) {
      console.error('Error creating job:', jobError);
      return;
    }
    
    console.log('✅ Job created:', job?.title || 'Job already exists');

    // Create an assignment for ujjwalreddyks@gmail.com
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .insert([
        {
          id: 'assignment-1',
          recruiter_id: 'recruiter-1',
          candidate_email: 'ujjwalreddyks@gmail.com',
          job_id: 'job-1',
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (assignmentError && !assignmentError.message.includes('duplicate')) {
      console.error('Error creating assignment:', assignmentError);
      return;
    }
    
    console.log('✅ Assignment created for:', assignment?.candidate_email || 'Assignment already exists');
    
    console.log('🎉 Database seeded successfully!');
    console.log('You can now authenticate with: ujjwalreddyks@gmail.com');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}

seedDatabase();
