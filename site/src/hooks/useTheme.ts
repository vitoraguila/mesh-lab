import { useCallback, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'
const KEY = 'mesh-lab-theme'

function readStored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'dark' || v === 'light' ? v : null
  } catch {
    return null
  }
}

/**
 * The page is dark by default because the subject is a terminal-and-cluster
 * workflow, but light mode is a first-class mode, not an afterthought.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme | undefined) ?? 'dark',
  )

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* private mode: the in-memory choice still applies for this visit */
    }
  }, [theme])

  useEffect(() => {
    if (readStored()) return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const apply = () => {
      if (!readStored()) setTheme(mq.matches ? 'light' : 'dark')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  return { theme, toggle }
}
