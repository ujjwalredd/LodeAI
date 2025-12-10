import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const { email, job_description } = await request.json()
    console.log('API: Validating email:', email)

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if candidate email exists in assignments table with job details
    console.log('API: Querying assignments table for email:', email.toLowerCase())
    
    // Query assignments table with joined job information using admin client
    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from('assignments')
      .select(`
        *,
        job:jobs(*)
      `)
      .eq('candidate_email', email.toLowerCase())
      .order('created_at', { ascending: false })
      .limit(1)

    console.log('API: Assignment query result:', { assignments, assignmentError })

    if (assignmentError || !assignments || assignments.length === 0) {
      console.log('API: No assignment found, error:', assignmentError)

      return NextResponse.json(
        {
          valid: false,
          error: 'No assignment found for this email address. Please contact your recruiter.'
        },
        { status: 404 }
      )
    }

    // Get the most recent assignment
    const assignment = assignments[0]

    // If job_description is provided, validate it matches
    if (job_description && assignment.job?.job_description !== job_description) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Job description does not match assigned job' 
        },
        { status: 400 }
      )
    }

    // Return the assignment with job description from the joined job table
    console.log('API: Returning assignment from database:', {
      id: assignment.id,
      candidate_email: assignment.candidate_email,
      job_title: assignment.job?.title,
      job_description_length: assignment.job?.job_description?.length || 0
    })

    return NextResponse.json({
      valid: true,
      assignment: {
        id: assignment.id,
        candidate_email: assignment.candidate_email,
        job_description: assignment.job?.job_description || '',
        job_title: assignment.job?.title || 'Assessment',
        assigned_at: assignment.created_at
      }
    })

  } catch (error) {
    console.error('Validation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
