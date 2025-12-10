'use client'

import { useState, useEffect } from 'react'
import { supabaseClient, Job, Assignment } from '../lib/supabaseClient'
import { Plus, Users, Mail, Calendar, Trash2 } from 'lucide-react'

interface CandidatePortalProps {
  userId: string
  onJobsChange?: () => void
}

export default function CandidatePortal({ userId, onJobsChange }: CandidatePortalProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [assignments, setAssignments] = useState<(Assignment & { job: Job })[]>([])
  const [candidateEmail, setCandidateEmail] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAssign, setShowAssign] = useState(false)

  useEffect(() => {
    fetchJobs()
    fetchAssignments()
  }, [userId])

  // Auto-refresh jobs every 5 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchJobs()
    }, 5000) // 5 seconds for more responsive updates

    return () => clearInterval(interval)
  }, [userId])

  // Refresh jobs when window regains focus (user switches back to tab)
  useEffect(() => {
    const handleFocus = () => {
      fetchJobs()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const fetchJobs = async () => {
    try {
      console.log('Fetching jobs for userId:', userId)
      const { data, error } = await supabaseClient
        .from('jobs')
        .select('*')
        .eq('recruiter_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      console.log('Fetched jobs:', data)
      setJobs(data || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }

  // Expose refresh function to parent component
  const refreshJobs = () => {
    fetchJobs()
  }

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('assignments')
        .select(`
          *,
          job:jobs(*)
        `)
        .eq('recruiter_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAssignments(data || [])
    } catch (error) {
      console.error('Error fetching assignments:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!candidateEmail.trim() || !selectedJobId) return

    setLoading(true)
    try {
      // Use the new API endpoint that handles email notifications
      const response = await fetch('/api/create-assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recruiter_id: userId,
          candidate_email: candidateEmail.trim().toLowerCase(),
          job_id: selectedJobId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create assignment')
      }

      console.log('Assignment created with email notification:', result)
      
      setCandidateEmail('')
      setSelectedJobId('')
      setShowAssign(false)
      fetchAssignments()
      // Also refresh jobs to ensure dropdown is up to date
      fetchJobs()

      // Assignment created successfully - no notification needed
      
    } catch (error) {
      console.error('Error creating assignment:', error)
      alert(`❌ Failed to create assignment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return

    try {
      const { error } = await supabaseClient
        .from('assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error
      fetchAssignments()
    } catch (error) {
      console.error('Error deleting assignment:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getJobTitle = (job: Job) => {
    return job.title || 'Untitled Job'
  }

  return (
    <div className="bg-white/4 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">Candidate Portal</h3>
        <button
          onClick={() => {
            setShowAssign(!showAssign)
            // Refresh jobs when opening assignment form
            if (!showAssign) {
              fetchJobs()
            }
          }}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {showAssign ? 'Cancel' : 'Assign Job'}
        </button>
      </div>

      {/* Assignment Form */}
      {showAssign && (
        <div className="mb-6 p-4 bg-gray-900/20 border border-white/10 rounded-lg">
          <h4 className="text-sm font-semibold text-white mb-3">Assign Job to Candidate</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Candidate Email
              </label>
              <input
                type="email"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-white/12 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-white/25 focus:bg-gray-800/50 transition-all"
                placeholder="candidate@example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Select Job ({jobs.length} available)
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-white/12 rounded-lg text-white text-sm focus:outline-none focus:border-white/25 focus:bg-gray-800/50 transition-all"
                required
              >
                <option value="">Choose a job...</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {getJobTitle(job)}
                  </option>
                ))}
              </select>
              {jobs.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  No jobs available. Create a job first in the Job Portal.
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !candidateEmail.trim() || !selectedJobId}
                className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Assigning...' : 'Assign Job'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAssign(false)
                  setCandidateEmail('')
                  setSelectedJobId('')
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Assignments List */}
      <div className="space-y-3">
        {assignments.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No assignments yet</p>
            <p className="text-gray-500 text-xs mt-1">Click "Assign Job" to assign your first job to a candidate</p>
          </div>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} className="bg-gray-900/20 border border-white/10 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-white text-sm font-medium">
                      {assignment.candidate_email}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-400">
                      Assigned: {formatDate(assignment.created_at)}
                    </span>
                  </div>
                  
                  {assignment.job && (
                    <div className="mt-2">
                      <p className="text-gray-300 text-sm">
                        <span className="text-gray-400">Job:</span> {getJobTitle(assignment.job)}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => deleteAssignment(assignment.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete assignment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      {assignments.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Total Assignments:</span>
            <span className="text-white font-semibold">{assignments.length}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-400">Unique Candidates:</span>
            <span className="text-white font-semibold">
              {new Set(assignments.map(a => a.candidate_email)).size}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
