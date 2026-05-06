import { useCallback, useEffect, useState } from 'react'

export function useLocalStorageState(key, initial, isValid) {
  const validate = typeof isValid === 'function' ? isValid : () => true

  const read = () => {
    try {
      const raw = localStorage.getItem(key)
      if (raw == null) return initial
      const parsed = JSON.parse(raw)
      return validate(parsed) ? parsed : initial
    } catch { return initial }
  }

  const [value, setValue] = useState(read)

  const setAndPersist = useCallback((next) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next
      try { localStorage.setItem(key, JSON.stringify(resolved)) } catch { /* noop */ }
      return resolved
    })
  }, [key])

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== key) return
      try {
        const parsed = e.newValue == null ? initial : JSON.parse(e.newValue)
        if (validate(parsed)) setValue(parsed)
      } catch { /* noop */ }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [key])

  return [value, setAndPersist]
}
