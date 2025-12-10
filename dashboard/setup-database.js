const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sgoplnmetluhnqiwigxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb3Bsbm1ldGx1aG5xaXdpZ3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjI0NTUsImV4cCI6MjA3MzY5ODQ1NX0.Rd9b2df0ME8zbNGFsJqH1xoRxW1NW8ch-lBhlRk8h6w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupDatabase() {
  try {
    console.log('🚀 Setting up LodeAI Dashboard Database...\n');

    // Test connection
    console.log('1. Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('jobs')
      .select('count')
      .limit(1);
    
    if (testError && testError.code !== 'PGRST116') {
      console.error('❌ Connection failed:', testError.message);
      console.log('\n📋 Please follow these steps:');
      console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
      console.log('2. Open your project: https://sgoplnmetluhnqiwigxs.supabase.co');
      console.log('3. Go to SQL Editor');
      console.log('4. Run the SQL from setup-supabase-tables.sql file');
      console.log('5. Then run this script again\n');
      return;
    }
    
    console.log('✅ Connection successful!\n');

    // Check if tables exist
    console.log('2. Checking existing tables...');
    
    const { data: jobsData, error: jobsError } = await supabase
      .from('jobs')
      .select('count')
      .limit(1);
    
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('assignments')
      .select('count')
      .limit(1);

    if (jobsError || assignmentsError) {
      console.log('❌ Tables not found. Please run the SQL setup first.');
      console.log('\n📋 Next steps:');
      console.log('1. Copy the SQL from setup-supabase-tables.sql');
      console.log('2. Go to Supabase SQL Editor');
      console.log('3. Paste and run the SQL');
      console.log('4. Run this script again\n');
      return;
    }

    console.log('✅ Tables exist!\n');

    // Get current user (you need to be authenticated)
    console.log('3. Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('❌ Not authenticated. Please sign up/sign in first.');
      console.log('\n📋 To authenticate:');
      console.log('1. Start your dashboard: npm run dev');
      console.log('2. Go to http://localhost:3000/auth');
      console.log('3. Sign up or sign in with your email');
      console.log('4. Then run this script again\n');
      return;
    }

    console.log(`✅ Authenticated as: ${user.email}\n`);

    // Create sample job
    console.log('4. Creating sample job...');
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert([
        {
          recruiter_id: user.id,
          title: 'Senior Frontend Developer',
          job_description: `We are looking for a Senior Frontend Developer to join our team. You will be responsible for building responsive web applications using modern technologies.

Requirements:
- 5+ years of experience with React, Vue, or Angular
- Strong knowledge of HTML, CSS, and JavaScript
- Experience with responsive design
- Knowledge of modern build tools (Webpack, Vite, etc.)
- Experience with version control (Git)

Your task is to create a modern, responsive web application that demonstrates your skills.`
        }
      ])
      .select()
      .single();

    if (jobError && !jobError.message.includes('duplicate')) {
      console.error('❌ Error creating job:', jobError.message);
      return;
    }

    console.log(`✅ Sample job created: ${job?.title || 'Job already exists'}\n`);

    // Create sample assignment
    console.log('5. Creating sample assignment...');
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .insert([
        {
          recruiter_id: user.id,
          candidate_email: 'ujjwalreddyks@gmail.com',
          job_id: job?.id || (await supabase.from('jobs').select('id').limit(1).single()).data?.id
        }
      ])
      .select()
      .single();

    if (assignmentError && !assignmentError.message.includes('duplicate')) {
      console.error('❌ Error creating assignment:', assignmentError.message);
      return;
    }

    console.log(`✅ Sample assignment created for: ${assignment?.candidate_email || 'Assignment already exists'}\n`);

    console.log('🎉 Database setup complete!');
    console.log('\n📋 What you can do now:');
    console.log('1. Go to http://localhost:3000/dashboard');
    console.log('2. You should see your sample job and assignment');
    console.log('3. Try adding more jobs and assigning them to candidates');
    console.log('4. All data is secured with Row Level Security (RLS)\n');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n📋 Troubleshooting:');
    console.log('1. Make sure your Supabase project is active');
    console.log('2. Check your internet connection');
    console.log('3. Verify your Supabase URL and keys in lib/supabaseClient.ts');
    console.log('4. Run the SQL setup first if tables don\'t exist\n');
  }
}

// Run the setup
setupDatabase();
