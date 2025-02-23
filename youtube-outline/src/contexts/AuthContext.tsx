import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../utils/supabase'

type AuthError = {
  message: string
  field?: 'email' | 'password'
}

type AuthContextType = {
  session: Session | null
  loading: boolean
  error: AuthError | null
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  clearError: () => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

type AuthProviderProps = {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  
  useEffect(() => {
    console.log('[AuthContext] Setting up auth listeners...');

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('[AuthContext] Initial session check:', { session, error });
      setSession(session);
    })
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Auth state changed:', { 
        event, 
        session,
        user: session?.user,
        accessToken: session?.access_token ? 'present' : 'missing'
      });
      setSession(session);
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
  const signUpWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: { user, session }, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        setError({ message: error.message })
        return
      }

      if (!session) {
        // This means email confirmation is required
        // The user is created but not confirmed
        if (user?.identities?.length === 0) {
          setError({ message: 'This email is already registered. Please sign in or reset your password.' })
        } else {
          console.log('[AuthContext] Sign up successful, verification email sent:', { user })
          return true // Indicate successful signup but needs verification
        }
      } else {
        // This means email confirmation is disabled in Supabase settings
        console.warn('[AuthContext] Warning: Email verification is disabled in Supabase settings')
        setSession(session)
      }
    } catch (e) {
      setError({ message: 'An unexpected error occurred during sign up.' })
      console.error('[AuthContext] Sign up error:', e)
    } finally {
      setLoading(false)
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setError({ message: error.message })
        return
      }

      setSession(data.session)
    } catch (e) {
      setError({ message: 'An unexpected error occurred during sign in.' })
      console.error('[AuthContext] Sign in error:', e)
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setError(null)

  return (
    <AuthContext.Provider value={{
      session,
      loading,
      error,
      signUpWithEmail,
      signInWithEmail,
      clearError
    }}>
      {children}
    </AuthContext.Provider>
  )
}
