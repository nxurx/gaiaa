import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getToken, settingsApi } from '../api'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSettings = useCallback(async () => {
    if (!getToken()) {
      setSettings(null)
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const data = await settingsApi.getMy()
      setSettings(data.data)
    } catch (err) {
      setError(err.message)
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
    const refreshOnFocus = () => {
      if (!document.hidden) fetchSettings()
    }
    document.addEventListener('visibilitychange', refreshOnFocus)
    const timer = setInterval(fetchSettings, 30000)
    return () => {
      document.removeEventListener('visibilitychange', refreshOnFocus)
      clearInterval(timer)
    }
  }, [fetchSettings])

  const updateSettings = useCallback(async (updates) => {
    try {
      const data = await settingsApi.update(updates)
      setSettings(data.data)
      localStorage.setItem('gaia_settings_updated_at', new Date().toISOString())
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  const testDiscord = useCallback(async (webhookUrl) => {
    try {
      await settingsApi.testDiscord(webhookUrl)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  const value = {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    updateSettings,
    testDiscord,
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return context
}
