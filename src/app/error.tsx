'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function Error({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
      <AlertTriangle size={64} className="text-red-500" />
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <p className="text-surface-600">{error.message || 'An unexpected error occurred.'}</p>
      <button className="skeu-btn-primary mt-4" onClick={() => reset()}>Try again</button>
    </div>
  )
}
