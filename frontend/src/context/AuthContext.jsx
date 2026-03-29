import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { buildFallbackProfile } from '../lib/userProfile'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const resolveInstructorProfile = async (sessionUser) => {
    return buildFallbackProfile(sessionUser)
  }

  useEffect(() => {
    let ignore = false

    const applySessionUser = async (sessionUser) => {
      if (!sessionUser) {
        if (!ignore) {
          setUser(null)
          setLoading(false)
        }
        return
      }

      const profile = await resolveInstructorProfile(sessionUser)

      if (!ignore) {
        setUser(profile)
        setLoading(false)
      }
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => applySessionUser(session?.user ?? null))
      .catch((error) => {
        console.error(error)
        if (!ignore) {
          setUser(null)
          setLoading(false)
        }
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true)
      void applySessionUser(session?.user ?? null)
    })

    return () => {
      ignore = true
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email, password, firstName, lastName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, type: 'instructor' },
      },
    })

    let profile = null

    if (!error) {
      if (data?.session?.user) {
        profile = await resolveInstructorProfile(data.session.user)
        setUser(profile)
      }
    }

    return { data, error, user: profile }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    let profile = null

    if (!error) {
      profile = await resolveInstructorProfile(data?.user ?? null)
      setUser(profile)
    }

    return { data, error, user: profile }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
    }
    return { error }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
