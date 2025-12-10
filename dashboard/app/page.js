'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to auth page
    router.push('/auth')
  }, [router])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl font-extrabold tracking-wide text-white mb-4">
          LodeAI
        </div>
        <div className="text-gray-400">Redirecting...</div>
      </div>
    </div>
  )
}
