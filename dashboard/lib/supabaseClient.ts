import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sgoplnmetluhnqiwigxs.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb3Bsbm1ldGx1aG5xaXdpZ3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMjI0NTUsImV4cCI6MjA3MzY5ODQ1NX0.Rd9b2df0ME8zbNGFsJqH1xoRxW1NW8ch-lBhlRk8h6w'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb3Bsbm1ldGx1aG5xaXdpZ3hzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODEyMjQ1NSwiZXhwIjoyMDczNjk4NDU1fQ.Vkz63dVM-oRxnWr1hyMLfj3wDORvSyAJN9JfOwDe544'

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Database types
export interface Job {
  id: string
  recruiter_id: string
  title: string
  job_description: string
  created_at: string
}

export interface Assignment {
  id: string
  recruiter_id: string
  candidate_email: string
  job_id: string
  created_at: string
}

export interface User {
  id: string
  email: string
  created_at: string
}
