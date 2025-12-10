import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseClient'
import { emailService } from '../../../lib/emailService'

export async function POST(request: NextRequest) {
  try {
    const { recruiter_id, candidate_email, job_id } = await request.json()
    console.log('API: Creating assignment for:', candidate_email)

    if (!recruiter_id || !candidate_email || !job_id) {
      return NextResponse.json(
        { error: 'Missing required fields: recruiter_id, candidate_email, job_id' },
        { status: 400 }
      )
    }

    // First, get the job details
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // Create the assignment
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('assignments')
      .insert([
        {
          recruiter_id: recruiter_id,
          candidate_email: candidate_email.trim().toLowerCase(),
          job_id: job_id
        }
      ])
      .select()
      .single()

    if (assignmentError) {
      console.error('Error creating assignment:', assignmentError)
      return NextResponse.json(
        { error: 'Failed to create assignment' },
        { status: 500 }
      )
    }

    console.log('Assignment created successfully:', assignment.id)

    // Send email notification (optional - won't fail if email fails)
    try {
      // Check if Mailgun is configured
      if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
        console.log('Mailgun not configured - skipping email notification')
      } else {
        const candidateName = candidate_email.split('@')[0].replace(/[._]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')

        const emailSent = await emailService.sendAssignmentNotification({
          candidateEmail: candidate_email,
          candidateName: candidateName,
          jobTitle: job.title,
          jobDescription: job.job_description,
          dashboardUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://lodeai-bpta89714-ujjwalreddyks-2966s-projects.vercel.app'
        })

        if (emailSent) {
          console.log('Email notification sent successfully to:', candidate_email)
        } else {
          console.warn('Failed to send email notification to:', candidate_email)
        }
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError)
      // Don't fail the assignment creation if email fails
    }

    return NextResponse.json({
      success: true,
      assignment: assignment,
      job: job
    })

  } catch (error) {
    console.error('Assignment creation error:', error)
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
