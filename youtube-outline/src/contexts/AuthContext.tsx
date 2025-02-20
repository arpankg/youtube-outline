import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../utils/supabase'

type AuthContextType = {
  session: Session | null
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
  
  return (
    <AuthContext.Provider value={{ session }}>
      {children}
    </AuthContext.Provider>
  )
}
