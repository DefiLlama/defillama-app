export const THEME_COOKIE_NAME = 'defillama-theme'

type Theme = 'dark' | 'light'

const VALID_THEME_VALUES = new Set<Theme>(['dark', 'light'])

const isSecureContext = (): boolean => {
	if (typeof window === 'undefined') {
		return process.env.NODE_ENV === 'production'
	}
	return window.location.protocol === 'https:' || window.location.hostname === 'localhost'
}

const sanitizeThemeValue = (value: string | null | undefined): Theme => {
	if (!value) return 'dark'
	const trimmed = String(value).trim()
	return VALID_THEME_VALUES.has(trimmed as Theme) ? (trimmed as Theme) : 'dark'
}

export const validateOrigin = (origin: string | undefined, allowedOrigins: string[]): boolean => {
	if (!origin) return false
	try {
		const originUrl = new URL(origin)
		return allowedOrigins.some((allowed) => {
			try {
				const allowedUrl = new URL(allowed)
				return originUrl.hostname === allowedUrl.hostname && originUrl.protocol === allowedUrl.protocol
			} catch {
				return false
			}
		})
	} catch {
		return false
	}
}

export const getThemeCookie = (): Theme | null => {
	if (typeof document === 'undefined') return null

	const cookies = document.cookie.split(';')
	const themeCookie = cookies.find((cookie) => cookie.trim().startsWith(`${THEME_COOKIE_NAME}=`))

	if (themeCookie) {
		const parts = themeCookie.split('=')
		if (parts.length >= 2 && parts[1]) {
			return sanitizeThemeValue(parts[1])
		}
	}

	return null
}

export const setThemeCookie = (isDarkMode: boolean): void => {
	if (typeof document === 'undefined') return

	const value = isDarkMode ? 'dark' : 'light'
	const expires = new Date()
	expires.setFullYear(expires.getFullYear() + 1) // 1 year expiry

	const secureFlag = isSecureContext() ? '; Secure' : ''
	const cookieString = `${THEME_COOKIE_NAME}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secureFlag}`

	document.cookie = cookieString
}

export const parseThemeCookie = (cookieString: string): Theme => {
	if (!cookieString) return 'dark'

	const cookies = cookieString.split(';')
	const themeCookie = cookies.find((cookie) => cookie.trim().startsWith(`${THEME_COOKIE_NAME}=`))

	if (themeCookie) {
		const parts = themeCookie.split('=')
		if (parts.length >= 2 && parts[1]) {
			return sanitizeThemeValue(parts[1])
		}
	}

	return 'dark'
}
