import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase'

function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session - this will automatically handle the OAuth callback
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        console.log('[AuthCallback] Processing auth callback:', {
          hasSession: !!session,
          error: sessionError,
          currentUrl: window.location.href
        })

        if (sessionError) {
          throw sessionError
        }

        if (!session) {
          throw new Error('No session established')
        }

        // Successfully authenticated
        console.log('[AuthCallback] Authentication successful, redirecting to dashboard')
        navigate('/dashboard')
      } catch (e) {
        console.error('[AuthCallback] Error processing auth callback:', e)
        setError(e instanceof Error ? e.message : 'An unexpected error occurred')
        // Redirect to signin page after a short delay to show the error
        setTimeout(() => navigate('/signin'), 3000)
      }
    }

    handleAuthCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full px-6 py-8 bg-white rounded-lg shadow-md">
          <div className="text-red-600 text-center mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="mt-2 text-xl font-semibold">Authentication Error</h3>
          </div>
          <p className="text-gray-600 text-center">{error}</p>
          <p className="text-gray-500 text-sm text-center mt-4">Redirecting to sign in page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full px-6 py-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <h3 className="mt-4 text-xl font-semibold">Completing Sign In</h3>
          <p className="text-gray-500 mt-2">Please wait while we complete your authentication...</p>
        </div>
      </div>
    </div>
  )
}

export default AuthCallback
