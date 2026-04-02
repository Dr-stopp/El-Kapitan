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
