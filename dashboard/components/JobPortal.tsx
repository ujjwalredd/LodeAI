'use client'

import { useState, useEffect } from 'react'
import { supabaseClient, Job } from '../lib/supabaseClient'
import { Plus, FileText, Trash2, Eye } from 'lucide-react'

interface JobPortalProps {
  userId: string
}

export default function JobPortal({ userId }: JobPortalProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)

  useEffect(() => {
    fetchJobs()
  }, [userId])

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('jobs')
        .select('*')
        .eq('recruiter_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setJobs(data || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jobTitle.trim() || !jobDescription.trim()) return

    setLoading(true)
    try {
      const { data, error } = await supabaseClient
        .from('jobs')
        .insert([
          {
            recruiter_id: userId,
            title: jobTitle.trim(),
            job_description: jobDescription.trim()
          }
        ])
        .select()

      if (error) throw error
      
      setJobTitle('')
      setJobDescription('')
      setShowUpload(false)
      fetchJobs()
    } catch (error) {
      console.error('Error creating job:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return

    try {
      const { error } = await supabaseClient
        .from('jobs')
        .delete()
        .eq('id', jobId)

      if (error) throw error
      fetchJobs()
    } catch (error) {
      console.error('Error deleting job:', error)
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

  return (
    <div className="bg-white/4 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">Job Portal</h3>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {showUpload ? 'Cancel' : 'Add Job'}
        </button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="mb-6 p-4 bg-gray-900/20 border border-white/10 rounded-lg">
          <h4 className="text-sm font-semibold text-white mb-3">Upload Job Description</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-white/12 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-white/25 focus:bg-gray-800/50 transition-all"
                placeholder="e.g., Senior Full Stack Developer"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Job Description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-white/12 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-white/25 focus:bg-gray-800/50 transition-all resize-none"
                placeholder="Paste the complete job description here..."
                rows={6}
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !jobTitle.trim() || !jobDescription.trim()}
                className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Job'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpload(false)
                  setJobTitle('')
                  setJobDescription('')
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Jobs List */}
      <div className="space-y-3">
        {jobs.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No jobs uploaded yet</p>
            <p className="text-gray-500 text-xs mt-1">Click "Add Job" to upload your first job description</p>
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="bg-gray-900/20 border border-white/10 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-400">
                      {formatDate(job.created_at)}
                    </span>
                  </div>
                  <h5 className="text-white text-sm font-semibold mb-1">
                    {job.title}
                  </h5>
                  <p className="text-gray-300 text-xs line-clamp-2 leading-relaxed">
                    {job.job_description.length > 150 
                      ? `${job.job_description.substring(0, 150)}...` 
                      : job.job_description
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setSelectedJob(job)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="View full description"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteJob(job.id)}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete job"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-white/20 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Job Details</h3>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="text-sm text-gray-400 mb-4">
              Created: {formatDate(selectedJob.created_at)}
            </div>
            <div className="mb-4">
              <h4 className="text-white font-semibold mb-2">Title:</h4>
              <p className="text-gray-300">{selectedJob.title}</p>
            </div>
            <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-2">Description:</h4>
              <pre className="text-white text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {selectedJob.job_description}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
