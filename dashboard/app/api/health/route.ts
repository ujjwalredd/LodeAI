import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'LodeAI Dashboard',
      version: '1.0.0'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'ERROR', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
