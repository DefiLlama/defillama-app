import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from 'react'
import { getThemeCookie, setThemeCookie } from '~/utils/cookies'
import { setStorageItem, subscribeToStorageKey } from './localStorageStore'

type ThemeContextType = {
	isDarkMode: boolean
	toggleDarkMode: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export const THEME_SYNC_KEY = 'defillama-theme' as const
export const DARK_MODE = 'DARK_MODE' as const

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
	const store = useSyncExternalStore(
		subscribeToTheme,
		() => getResolvedTheme(),
		() => 'dark'
	)

	const isDarkMode = store === 'dark'

	const applyTheme = useCallback((isDark: boolean) => {
		const restoreTransitions = disableTransitions()
		if (!isDark) {
			document.documentElement.classList.remove('dark')
			document.documentElement.classList.add('light')
		} else {
			document.documentElement.classList.remove('light')
			document.documentElement.classList.add('dark')
		}
		restoreTransitions()
	}, [])

	const toggleDarkMode = useCallback(() => {
		const nextTheme = !isDarkMode ? 'dark' : 'light'
		setThemeCookie(!isDarkMode)
		setStorageItem(THEME_SYNC_KEY, nextTheme)
	}, [isDarkMode])

	useEffect(() => {
		applyTheme(isDarkMode)
	}, [applyTheme, isDarkMode])

	return <ThemeContext value={{ isDarkMode, toggleDarkMode }}>{children}</ThemeContext>
}

export const useTheme = () => {
	const context = useContext(ThemeContext)
	if (!context) {
		throw new Error('useTheme must be used within a ThemeProvider')
	}
	return context
}

const subscribeToTheme = (cb: () => void) => subscribeToStorageKey(THEME_SYNC_KEY, cb)

const getResolvedTheme = (): 'dark' | 'light' => {
	const themeCookie = getThemeCookie()
	if (themeCookie) return themeCookie

	if (typeof document !== 'undefined') {
		if (document.documentElement.classList.contains('light')) return 'light'
		if (document.documentElement.classList.contains('dark')) return 'dark'
	}

	return 'dark'
}

const disableTransitions = () => {
	const style = document.createElement('style')
	style.appendChild(
		document.createTextNode(
			`*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}`
		)
	)
	document.head.appendChild(style)

	return () => {
		;(() => window.getComputedStyle(document.body))()

		setTimeout(() => {
			document.head.removeChild(style)
		}, 1)
	}
}
