import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseClient'

export async function GET() {
  try {
    console.log('Testing database connection...')
    
    // Test basic connection
    const { data, error } = await supabaseAdmin
      .from('assignments')
      .select('count(*)')
      .limit(1)
    
    if (error) {
      console.error('Database connection error:', error)
      return NextResponse.json({
        success: false,
        error: error.message,
        details: 'Database connection failed'
      })
    }
    
    // Test if assignments table has data
    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from('assignments')
      .select('*')
      .limit(5)
    
    if (assignmentError) {
      console.error('Assignments query error:', assignmentError)
      return NextResponse.json({
        success: false,
        error: assignmentError.message,
        details: 'Assignments query failed'
      })
    }
    
    console.log('Database connection successful')
    console.log('Assignments found:', assignments?.length || 0)
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      assignmentCount: assignments?.length || 0,
      sampleAssignments: assignments?.slice(0, 2) || []
    })
    
  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: 'API test failed'
    })
  }
}
