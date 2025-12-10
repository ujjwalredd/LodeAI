'use client'

import { useState } from 'react'
import { supabaseClient } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/dashboard')
      } else {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        if (data.user) {
          router.push('/dashboard')
        }
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-5">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="text-2xl font-extrabold tracking-wide text-white">
            LodeAI
          </div>
        </div>
        
        {/* Hero Text */}
        <h1 className="text-3xl font-extrabold text-white mb-2 leading-tight">
          Welcome to LodeAI
        </h1>
        <p className="text-base text-white mb-7 leading-relaxed">
          AI-Powered Recruitment Platform
        </p>
        
        {/* Auth Form */}
        <div className="bg-white/4 border border-white/10 rounded-xl p-6 mb-4">
          <h2 className="text-lg font-bold text-gray-200 mb-1">
            {isLogin ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="text-sm text-gray-400 mb-5">
            {isLogin 
              ? 'Sign in to your recruiter account' 
              : 'Create a new recruiter account'
            }
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white mb-2 text-left">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-white/12 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-white/25 focus:bg-gray-800/50 transition-all"
                placeholder="your.email@example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white mb-2 text-left">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-white/12 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-white/25 focus:bg-gray-800/50 transition-all"
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black text-sm font-extrabold py-4 px-6 rounded-xl cursor-pointer transition-all hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>
          
          {/* Toggle between login/signup */}
          <div className="mt-4 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              {isLogin 
                ? "Don't have an account? Create one" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-500/8 border border-red-500/30 rounded-xl p-3 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
