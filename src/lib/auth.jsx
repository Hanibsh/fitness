import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { fetchProfile } from './profile'

// Tracks the signed-in user across the app. If Supabase isn't configured
// (no env vars), it stays "signed out" and everything runs anonymously.
// Also carries the user's display nickname so any component (navbar, dashboard)
// can show it; `setNickname` lets editors update it live everywhere.
const AuthContext = createContext({ user: null, loading: true, nickname: '', setNickname: () => {}, signOut: async () => {} })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [nickname, setNickname] = useState('')

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Load the display nickname whenever the signed-in user changes.
  useEffect(() => {
    let cancelled = false
    if (!supabase || !user) {
      setNickname('')
      return
    }
    fetchProfile(user.id)
      .then((p) => { if (!cancelled) setNickname(p?.display_name || '') })
      .catch(() => {})
    return () => { cancelled = true }
  }, [user])

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, loading, nickname, setNickname, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
