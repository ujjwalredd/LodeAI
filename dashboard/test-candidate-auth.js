const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sgoplnmetluhnqiwigxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb3Bsbm1ldGx1aG5xaXdpZ3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjI0NTUsImV4cCI6MjA3MzY5ODQ1NX0.Rd9b2df0ME8zbNGFsJqH1xoRxW1NW8ch-lBhlRk8h6w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testCandidateAuthentication() {
  try {
    console.log('🧪 Testing Candidate Authentication Flow...\n');

    // Test 1: Check if tables exist
    console.log('1. Checking database tables...');
    
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .limit(1);
    
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*')
      .limit(1);

    if (jobsError || assignmentsError) {
      console.log('❌ Tables not found. Please run the SQL setup first.');
      console.log('   Run: node setup-database.js');
      return;
    }

    console.log('✅ Tables exist\n');

    // Test 2: Check if we have any assignments
    console.log('2. Checking existing assignments...');
    
    const { data: allAssignments, error: allAssignmentsError } = await supabase
      .from('assignments')
      .select(`
        *,
        job:jobs(*)
      `);

    if (allAssignmentsError) {
      console.log('❌ Error querying assignments:', allAssignmentsError.message);
      return;
    }

    console.log(`✅ Found ${allAssignments?.length || 0} assignments`);

    if (!allAssignments || allAssignments.length === 0) {
      console.log('\n📋 No assignments found. You need to:');
      console.log('1. Go to http://localhost:3000/dashboard');
      console.log('2. Sign up/sign in');
      console.log('3. Add a job in the Job Portal');
      console.log('4. Assign it to ujjwalreddyks@gmail.com in Candidate Portal');
      return;
    }

    // Test 3: Test the API endpoint directly
    console.log('\n3. Testing API endpoint...');
    
    const testEmail = 'ujjwalreddyks@gmail.com';
    console.log(`   Testing with email: ${testEmail}`);

    try {
      const response = await fetch('http://localhost:3000/api/validate-candidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          job_description: ''
        })
      });

      const result = await response.json();
      
      if (response.ok && result.valid) {
        console.log('✅ API endpoint working correctly!');
        console.log(`   Job Title: ${result.assignment.job_title}`);
        console.log(`   Job Description Length: ${result.assignment.job_description.length} characters`);
        console.log(`   Assigned At: ${result.assignment.assigned_at}`);
        
        console.log('\n🎉 Complete flow test successful!');
        console.log('\n📋 Next steps:');
        console.log('1. Open VSCode');
        console.log('2. Open the LodeAI extension');
        console.log('3. Enter email: ujjwalreddyks@gmail.com');
        console.log('4. The extension should authenticate and get the job description');
        console.log('5. The AI agent will use this job description to create the assessment');
        
      } else {
        console.log('❌ API endpoint failed:', result.error || 'Unknown error');
        console.log('   Response:', result);
      }

    } catch (fetchError) {
      console.log('❌ API endpoint not reachable:', fetchError.message);
      console.log('   Make sure the dashboard is running: npm run dev');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCandidateAuthentication();
