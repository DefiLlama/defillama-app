export const THEME_COOKIE_NAME = 'defillama-theme'

// Client-side cookie operations
export const getThemeCookie = (): string | null => {
	if (typeof document === 'undefined') return null

	const cookies = document.cookie.split(';')
	const themeCookie = cookies.find((cookie) => cookie.trim().startsWith(`${THEME_COOKIE_NAME}=`))

	if (themeCookie) {
		return themeCookie.split('=')[1]
	}

	return null
}

export const setThemeCookie = (isDarkMode: boolean): void => {
	if (typeof document === 'undefined') return

	const value = isDarkMode ? 'true' : 'false'
	const expires = new Date()
	expires.setFullYear(expires.getFullYear() + 1) // 1 year expiry

	document.cookie = `${THEME_COOKIE_NAME}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
}

// Server-side cookie parsing (for _document.js script)
export const parseThemeCookie = (cookieString: string): string => {
	if (!cookieString) return 'true'

	const cookies = cookieString.split(';')
	const themeCookie = cookies.find((cookie) => cookie.trim().startsWith(`${THEME_COOKIE_NAME}=`))

	if (themeCookie) {
		return themeCookie.split('=')[1] || 'true'
	}

	return 'true'
}
