import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'

const Button = ({ 
  children, 
  loading = false,
  onClick,
  className = ''
}: { 
  children: React.ReactNode
  loading?: boolean
  onClick?: () => void
  className?: string
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className={`flex w-full items-center justify-center rounded-md border px-4 py-2 text-sm font-medium shadow-sm ${className}`}
  >
    {loading ? (
      <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-current" />
    ) : children}
  </button>
)

export const SignInPage = () => {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      navigate('/dashboard')
    }
  }, [session, navigate])

  const signInWithGoogle = async () => {
    console.log('[SignInPage] Starting Google OAuth...', {
      currentUrl: window.location.href,
      redirectUrl: `${window.location.origin}/auth/callback`
    })

    try {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        console.error('[SignInPage] OAuth error:', error)
        setError(error.message)
      } else {
        console.log('[SignInPage] OAuth initiated:', data)
      }
    } catch (e) {
      console.error('[SignInPage] Unexpected error:', e)
      setError('An unexpected error occurred during sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-white py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-4xl font-bold tracking-tight text-gray-900">
          Welcome to LectureTube
        </h2>
        <p className="mt-2 text-center text-lg text-gray-600">
          Sign in to generate FlashCards and chat with <br /> YouTube videos
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-white px-8 py-8 shadow-sm border border-gray-200">
          <Button
            onClick={signInWithGoogle}
            loading={loading}
            className="bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm"
          >
            <img src="/google.svg" alt="Google" className="mr-2 h-5 w-5" />
            Continue with Google
          </Button>

          <p className="mt-4 text-center text-xs text-gray-600">
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-gray-600 hover:text-gray-900 underline">Terms of Service</a>{' '}
            and{' '}
            <a href="/privacy" className="text-gray-600 hover:text-gray-900 underline">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
