import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase'
import { useAuth } from '../contexts/AuthContext'

interface AuthFormData {
  email: string
  password: string
}

type AuthMode = 'signin' | 'signup'

const Input = ({ 
  label, 
  type, 
  value, 
  onChange, 
  error 
}: { 
  label: string
  type: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string 
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">
      {label}
    </label>
    <div className="mt-1">
      <input
        type={type}
        value={value}
        onChange={onChange}
        className={`block w-full rounded-md border ${error ? 'border-red-300' : 'border-gray-300'} px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
      />
    </div>
    {error && (
      <p className="mt-1 text-sm text-red-600">{error}</p>
    )}
  </div>
)

const Button = ({ 
  children, 
  type = 'button',
  loading = false,
  onClick,
  className = ''
}: { 
  children: React.ReactNode
  type?: 'button' | 'submit'
  loading?: boolean
  onClick?: () => void
  className?: string
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={loading}
    className={`flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${className}`}
  >
    {loading ? 'Loading...' : children}
  </button>
)

export const SignInPage = () => {
  const navigate = useNavigate()
  const { signInWithEmail, signUpWithEmail, loading, error, session } = useAuth()
  
  const [mode, setMode] = useState<AuthMode>('signin')
  const [formData, setFormData] = useState<AuthFormData>({
    email: '',
    password: ''
  })
  const [formError, setFormError] = useState<{ field?: 'email' | 'password', message: string } | null>(null)
  const [showVerificationMessage, setShowVerificationMessage] = useState(false)

  useEffect(() => {
    if (session) {
      navigate('/dashboard')
    }
  }, [session, navigate])

  const signInWithGoogle = async () => {
    console.log('[SignInPage] Starting Google OAuth...', {
      currentUrl: window.location.href,
      redirectUrl: `${window.location.origin}/dashboard`
    })

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (error) {
        console.error('[SignInPage] OAuth error:', error)
      } else {
        console.log('[SignInPage] OAuth initiated:', data)
      }
    } catch (e) {
      console.error('[SignInPage] Unexpected error:', e)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setShowVerificationMessage(false)

    // Basic validation
    if (!formData.email || !formData.password) {
      setFormError({ message: 'Please fill in all fields' })
      return
    }

    if (formData.password.length < 6) {
      setFormError({ field: 'password', message: 'Password must be at least 6 characters' })
      return
    }

    try {
      if (mode === 'signin') {
        await signInWithEmail(formData.email, formData.password)
      } else {
        await signUpWithEmail(formData.email, formData.password)
        setShowVerificationMessage(true)
      }
    } catch (e) {
      // Error handling is done in AuthContext
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Form Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button 
                  onClick={() => {
                    setMode('signup')
                    setFormError(null)
                    setShowVerificationMessage(false)
                  }} 
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button 
                  onClick={() => {
                    setMode('signin')
                    setFormError(null)
                    setShowVerificationMessage(false)
                  }} 
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        {/* Success Message */}
        {showVerificationMessage && (
          <div className="rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">
                  Please check your email to verify your account
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {(error || formError) && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">
                  {error?.message || formError?.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="mt-8">
          <div className="rounded-lg bg-white px-4 py-5 shadow sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email address"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={formError?.field === 'email' ? formError.message : undefined}
              />
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                error={formError?.field === 'password' ? formError.message : undefined}
              />
              <Button type="submit" loading={loading}>
                {mode === 'signin' ? 'Sign in' : 'Sign up'}
              </Button>
            </form>
          </div>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-gray-50 px-2 text-gray-500">Or continue with</span>
          </div>
        </div>

        {/* Google Sign In */}
        <Button
          onClick={signInWithGoogle}
          className="!bg-white !text-gray-700 hover:!bg-gray-50 border-gray-300"
        >
          <img src="/google.svg" alt="Google" className="mr-2 h-5 w-5" />
          Sign in with Google
        </Button>
      </div>
    </div>
  )
}
