import { supabase } from './supabase'

const PROFILE_PASSWORD_PLACEHOLDER = 'SUPABASE_AUTH_MANAGED'

function readMetaValue(user, ...keys) {
  for (const key of keys) {
    const value = user?.user_metadata?.[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

export function buildFallbackProfile(user) {
  if (!user) return null

  return {
    id: user.id,
    email: user.email ?? '',
    role: readMetaValue(user, 'role', 'type') || 'instructor',
    firstName: readMetaValue(user, 'first_name', 'firstName'),
    lastName: readMetaValue(user, 'last_name', 'lastName'),
  }
}

export async function readUserProfileByEmail(email, fallbackUser = null) {
  const fallbackProfile = buildFallbackProfile(fallbackUser)

  if (!supabase || !email) {
    return fallbackProfile
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, type, first_name, last_name, email')
      .eq('email', email)
      .maybeSingle()

    if (error || !data) {
      if (error) {
        console.warn('Falling back to auth profile because users lookup failed.', error)
      }
      return fallbackProfile
    }

    return {
      id: data.id ?? fallbackProfile?.id ?? email,
      email: data.email ?? fallbackProfile?.email ?? email,
      role: data.type || fallbackProfile?.role || 'instructor',
      firstName: data.first_name || fallbackProfile?.firstName || '',
      lastName: data.last_name || fallbackProfile?.lastName || '',
    }
  } catch (error) {
    console.warn('Falling back to auth profile because users lookup threw.', error)
    return fallbackProfile
  }
}

export async function ensureInstructorProfile({ email, firstName, lastName }) {
  if (!supabase || !email) return null

  try {
    const { data: existing, error: lookupError } = await supabase
      .from('users')
      .select('id, email, type, first_name, last_name')
      .eq('email', email)
      .maybeSingle()

    if (lookupError) {
      throw lookupError
    }

    if (existing) {
      return {
        id: existing.id,
        email: existing.email ?? email,
        role: existing.type || 'instructor',
        firstName: existing.first_name || firstName || '',
        lastName: existing.last_name || lastName || '',
      }
    }

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        type: 'instructor',
        first_name: firstName || 'Instructor',
        last_name: lastName || '',
        password: PROFILE_PASSWORD_PLACEHOLDER,
        registration_date: now,
        password_last_changed: now,
      })
      .select('id, email, type, first_name, last_name')
      .single()

    if (error) {
      throw error
    }

    return {
      id: data.id,
      email: data.email ?? email,
      role: data.type || 'instructor',
      firstName: data.first_name || firstName || '',
      lastName: data.last_name || lastName || '',
    }
  } catch (error) {
    console.warn('Unable to create instructor profile row.', error)
    return null
  }
}
