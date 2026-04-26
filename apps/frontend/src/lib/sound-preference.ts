const SOUND_PREFERENCE_VALUE_KEY = 'tribunal:sound-enabled'

export function readStoredSoundPreference(): boolean | null {
  if (typeof window === 'undefined') {
    return null
  }

  const value = window.localStorage.getItem(SOUND_PREFERENCE_VALUE_KEY)

  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return null
}

export function saveStoredSoundPreference(value: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SOUND_PREFERENCE_VALUE_KEY, value ? 'true' : 'false')
}

export function resolveSoundEnabledPreference(valueFromServer: boolean) {
  const stored = readStoredSoundPreference()

  if (stored !== null) {
    return stored
  }

  // Older families had no visible sound switch in UI.
  // If the server still carries the legacy default false, prefer enabling sound locally.
  void valueFromServer
  return true
}
