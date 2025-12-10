'use client'

import { useState, useEffect } from 'react'
import { supabaseClient } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import JobPortal from './JobPortal'
import CandidatePortal from './CandidatePortal'
import { LogOut, User, FileText, Users, BarChart3 } from 'lucide-react'

export default function RecruiterDashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (user) {
        setUser(user)
      } else {
        router.push('/auth')
      }
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/auth')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabaseClient.auth.signOut()
      router.push('/auth')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-extrabold tracking-wide text-white mb-4">
            LodeAI
          </div>
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-gray-900/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="text-xl font-extrabold tracking-wide text-white">
                LodeAI
              </div>
              <div className="text-sm text-gray-400">Recruiter Dashboard</div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <User className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome back, {user.email?.split('@')[0]}!
          </h1>
          <p className="text-gray-400">
            Manage your job postings and candidate assignments
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/4 border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Jobs</p>
                <p className="text-2xl font-bold text-white">-</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/4 border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Candidates Assigned</p>
                <p className="text-2xl font-bold text-white">-</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/4 border border-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Active Assignments</p>
                <p className="text-2xl font-bold text-white">-</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Job Portal */}
          <div className="space-y-6">
            <JobPortal userId={user.id} />
          </div>

          {/* Candidate Portal */}
          <div className="space-y-6">
            <CandidatePortal 
              userId={user.id} 
              onJobsChange={() => {
                // This will be called when jobs change
                console.log('Jobs changed, refreshing candidate portal...')
              }}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white/4 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="p-4 bg-gray-900/50 border border-white/10 rounded-lg text-left hover:bg-gray-800/50 transition-colors">
              <div className="text-sm font-semibold text-white mb-1">Upload Job</div>
              <div className="text-xs text-gray-400">Add a new job description</div>
            </button>
            
            <button className="p-4 bg-gray-900/50 border border-white/10 rounded-lg text-left hover:bg-gray-800/50 transition-colors">
              <div className="text-sm font-semibold text-white mb-1">Assign Candidate</div>
              <div className="text-xs text-gray-400">Assign job to candidate</div>
            </button>
            
            <button className="p-4 bg-gray-900/50 border border-white/10 rounded-lg text-left hover:bg-gray-800/50 transition-colors">
              <div className="text-sm font-semibold text-white mb-1">View Analytics</div>
              <div className="text-xs text-gray-400">Check assignment progress</div>
            </button>
            
            <button className="p-4 bg-gray-900/50 border border-white/10 rounded-lg text-left hover:bg-gray-800/50 transition-colors">
              <div className="text-sm font-semibold text-white mb-1">Export Data</div>
              <div className="text-xs text-gray-400">Download reports</div>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
