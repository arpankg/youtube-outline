import { supabase } from '../utils/supabase'

export const SignInPage = () => {
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    })
    if (error) console.error('Error:', error.message)
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <button
        onClick={signInWithGoogle}
        className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-gray-700 shadow-md hover:bg-gray-50"
      >
        <img src="/google.svg" alt="Google" className="h-5 w-5" />
        Sign in with Google
      </button>
    </div>
  )
}
