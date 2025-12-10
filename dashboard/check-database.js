const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sgoplnmetluhnqiwigxs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb3Bsbm1ldGx1aG5xaXdpZ3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjI0NTUsImV4cCI6MjA3MzY5ODQ1NX0.Rd9b2df0ME8zbNGFsJqH1xoRxW1NW8ch-lBhlRk8h6w';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
  try {
    console.log('🔍 Checking database tables...');
    
    // Check if assignment_details table exists
    const { data: assignmentDetails, error: assignmentDetailsError } = await supabase
      .from('assignment_details')
      .select('*')
      .limit(1);

    console.log('assignment_details table:', { assignmentDetails, assignmentDetailsError });
    
    // Check if assignments table exists
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*')
      .limit(1);

    console.log('assignments table:', { assignments, assignmentsError });
    
    // Check if jobs table exists
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .limit(1);

    console.log('jobs table:', { jobs, jobsError });
    
    // If assignment_details table exists, try to insert data
    if (!assignmentDetailsError) {
      console.log('✅ assignment_details table exists');
      
      // Try to insert assignment for ujjwalreddyks@gmail.com
      const { data: insertData, error: insertError } = await supabase
        .from('assignment_details')
        .insert([
          {
            id: 'assignment-1',
            candidate_mail: 'ujjwalreddyks@gmail.com',
            job_description: 'Create a modern web application with the following requirements:\n\n1. Build a responsive landing page with a hero section\n2. Include a contact form with client-side validation\n3. Use modern CSS (Flexbox/Grid) for layout\n4. Make it fully mobile-responsive\n5. Add smooth animations and transitions\n6. Use semantic HTML structure\n\nTechnical Requirements:\n- Use any frontend framework (React, Vue, Angular) or vanilla JavaScript\n- Implement responsive design principles\n- Include form validation\n- Add loading states and user feedback\n- Write clean, maintainable code\n\nThis assessment will evaluate your frontend development skills, code quality, and attention to detail.',
            job_title: 'Senior Frontend Developer Assessment',
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (insertError && !insertError.message.includes('duplicate')) {
        console.error('Error inserting assignment:', insertError);
      } else {
        console.log('✅ Assignment created for ujjwalreddyks@gmail.com');
      }
    } else {
      console.log('❌ assignment_details table does not exist or is not accessible');
      console.log('Error:', assignmentDetailsError);
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

checkDatabase();
