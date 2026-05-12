export const THEME_COOKIE_NAME = 'defillama-theme'
export const ANNOUNCEMENT_DISMISSALS_COOKIE_NAME = 'defillama-dismissed-announcements'
export const ANNOUNCEMENT_DISMISSAL_STYLE_ATTRIBUTE = 'data-announcement-dismissals'
export const ANNOUNCEMENT_DISMISSAL_TOKEN_PATTERN = '^[a-z0-9-]+(?:--[a-z0-9-]+)?$'
export const LLAMAAI_SIDEBAR_HIDDEN_COOKIE_NAME = 'llamaai-sidebar-hidden'
export const LLAMAAI_FULLSCREEN_COOKIE_NAME = 'llamaai-fullscreen'
const MAX_DISMISSED_ANNOUNCEMENT_TOKENS = 32
const LLAMAAI_FULLSCREEN_ATTRIBUTE = 'data-llamaai-fullscreen'
const LLAMAAI_SIDEBAR_HIDDEN_ATTRIBUTE = 'data-llamaai-sidebar-hidden'

type Theme = 'dark' | 'light'
type LlamaAICookieName = typeof LLAMAAI_SIDEBAR_HIDDEN_COOKIE_NAME | typeof LLAMAAI_FULLSCREEN_COOKIE_NAME

const VALID_THEME_VALUES: ReadonlySet<string> = new Set<string>(['dark', 'light'])
const VALID_ANNOUNCEMENT_TOKEN_REGEX = new RegExp(ANNOUNCEMENT_DISMISSAL_TOKEN_PATTERN)
const ANNOUNCEMENT_DISMISSAL_STYLE_SELECTOR = `style[${ANNOUNCEMENT_DISMISSAL_STYLE_ATTRIBUTE}]`

const isSecureContext = (): boolean => {
	if (typeof window === 'undefined') {
		return process.env.NODE_ENV === 'production'
	}
	return window.location.protocol === 'https:' || window.location.hostname === 'localhost'
}

const isTheme = (value: string): value is Theme => VALID_THEME_VALUES.has(value)

const sanitizeThemeValue = (value: string | null | undefined): Theme => {
	if (!value) return 'dark'
	const trimmed = String(value).trim()
	return isTheme(trimmed) ? trimmed : 'dark'
}

const getCookieValue = (cookieString: string, cookieName: string): string | null => {
	if (!cookieString) return null

	const cookies = cookieString.split(';')
	const matchingCookie = cookies.find((cookie) => cookie.trim().startsWith(`${cookieName}=`))
	if (!matchingCookie) return null

	const parts = matchingCookie.split('=')
	if (parts.length < 2 || !parts[1]) return null

	return parts.slice(1).join('=')
}

const isInteractiveLlamaAIPath = (pathname: string): boolean => {
	return (
		pathname === '/ai/chat' ||
		pathname.startsWith('/ai/chat/') ||
		pathname === '/ai/projects' ||
		pathname.startsWith('/ai/projects/')
	)
}

const syncLlamaAIChromeAttributesForPath = (pathname: string, fullscreen: boolean, sidebarHidden: boolean): void => {
	if (typeof document === 'undefined') return

	const root = document.documentElement

	if (!isInteractiveLlamaAIPath(pathname)) {
		clearLlamaAIChromeAttributes()
		return
	}

	if (fullscreen) {
		root.setAttribute(LLAMAAI_FULLSCREEN_ATTRIBUTE, 'true')
	} else {
		root.removeAttribute(LLAMAAI_FULLSCREEN_ATTRIBUTE)
	}

	if (sidebarHidden) {
		root.setAttribute(LLAMAAI_SIDEBAR_HIDDEN_ATTRIBUTE, 'true')
	} else {
		root.removeAttribute(LLAMAAI_SIDEBAR_HIDDEN_ATTRIBUTE)
	}
}

export const clearLlamaAIChromeAttributes = (): void => {
	if (typeof document === 'undefined') return
	document.documentElement.removeAttribute(LLAMAAI_FULLSCREEN_ATTRIBUTE)
	document.documentElement.removeAttribute(LLAMAAI_SIDEBAR_HIDDEN_ATTRIBUTE)
}

const sanitizeAnnouncementTokenPart = (value: string, fallback: string): string => {
	const normalized = value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
	return normalized || fallback
}

const normalizeAnnouncementTokens = (tokens: string[]): string[] => {
	const uniqueTokens: string[] = []
	const seen = new Set<string>()

	for (const token of tokens) {
		const trimmedToken = token.trim()
		if (!VALID_ANNOUNCEMENT_TOKEN_REGEX.test(trimmedToken) || seen.has(trimmedToken)) continue
		seen.add(trimmedToken)
		uniqueTokens.push(trimmedToken)
		if (uniqueTokens.length >= MAX_DISMISSED_ANNOUNCEMENT_TOKENS) break
	}

	return uniqueTokens
}

export const createAnnouncementDismissalCSS = (tokens: string[]): string => {
	return normalizeAnnouncementTokens(tokens)
		.map((token) => `.announcement-token--${token}{display:none!important;}`)
		.join('')
}

export const syncAnnouncementDismissalStyles = (tokens: string[]): void => {
	if (typeof document === 'undefined') return

	const selectors = createAnnouncementDismissalCSS(tokens)
	const existingStyleTag = document.head.querySelector<HTMLStyleElement>(ANNOUNCEMENT_DISMISSAL_STYLE_SELECTOR)

	if (!selectors) {
		existingStyleTag?.remove()
		return
	}

	if (existingStyleTag) {
		existingStyleTag.textContent = selectors
		return
	}

	const style = document.createElement('style')
	style.setAttribute(ANNOUNCEMENT_DISMISSAL_STYLE_ATTRIBUTE, 'true')
	style.textContent = selectors
	document.head.appendChild(style)
}

export const getHeadBootstrapScript = (): string => `
	(function() {
		var VALID_THEME_VALUES = ['dark', 'light'];
		var ANNOUNCEMENT_TOKEN_REGEX = new RegExp('${ANNOUNCEMENT_DISMISSAL_TOKEN_PATTERN}');

		function getCookieValue(cookieString, targetCookieName) {
			if (!cookieString) return null;
			var cookies = cookieString.split(';');
			var matchingCookie = cookies.find(function(cookie) {
				return cookie.trim().startsWith(targetCookieName + '=');
			});
			if (!matchingCookie) return null;
			var parts = matchingCookie.split('=');
			if (parts.length < 2 || !parts[1]) return null;
			return parts.slice(1).join('=');
		}

		function sanitizeThemeValue(value) {
			if (!value) return 'dark';
			var trimmed = String(value).trim();
			return VALID_THEME_VALUES.indexOf(trimmed) !== -1 ? trimmed : 'dark';
		}

		function isInteractiveLlamaAIPath(pathname) {
			return pathname === '/ai/chat' || pathname.startsWith('/ai/chat/');
		}

		var root = document.documentElement;
		var theme = sanitizeThemeValue(getCookieValue(document.cookie, '${THEME_COOKIE_NAME}'));

		if (theme === 'light') {
			root.classList.remove('dark');
			root.classList.add('light');
		} else {
			root.classList.remove('light');
			root.classList.add('dark');
		}

		var announcementCookieValue = getCookieValue(document.cookie, '${ANNOUNCEMENT_DISMISSALS_COOKIE_NAME}');
		if (announcementCookieValue) {
			var announcementTokens;
			try {
				announcementTokens = decodeURIComponent(announcementCookieValue).split(',');
			} catch (_error) {
				announcementTokens = announcementCookieValue.split(',');
			}

			var selectors = announcementTokens
				.map(function(token) {
					var normalizedToken = token.trim();
					if (!ANNOUNCEMENT_TOKEN_REGEX.test(normalizedToken)) return '';
					return '.announcement-token--' + normalizedToken + '{display:none!important;}';
				})
				.filter(Boolean)
				.join('');

			if (selectors) {
				var style = document.createElement('style');
				style.setAttribute('${ANNOUNCEMENT_DISMISSAL_STYLE_ATTRIBUTE}', 'true');
				style.textContent = selectors;
				document.head.appendChild(style);
			}
		}

		var pathname = window.location.pathname;
		if (!isInteractiveLlamaAIPath(pathname)) {
			root.removeAttribute('${LLAMAAI_FULLSCREEN_ATTRIBUTE}');
			root.removeAttribute('${LLAMAAI_SIDEBAR_HIDDEN_ATTRIBUTE}');
			return;
		}

		if (getCookieValue(document.cookie, '${LLAMAAI_FULLSCREEN_COOKIE_NAME}') === 'true') {
			root.setAttribute('${LLAMAAI_FULLSCREEN_ATTRIBUTE}', 'true');
		} else {
			root.removeAttribute('${LLAMAAI_FULLSCREEN_ATTRIBUTE}');
		}

		if (getCookieValue(document.cookie, '${LLAMAAI_SIDEBAR_HIDDEN_COOKIE_NAME}') === 'true') {
			root.setAttribute('${LLAMAAI_SIDEBAR_HIDDEN_ATTRIBUTE}', 'true');
		} else {
			root.removeAttribute('${LLAMAAI_SIDEBAR_HIDDEN_ATTRIBUTE}');
		}
	})();
`

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

	const themeCookie = getCookieValue(document.cookie, THEME_COOKIE_NAME)
	if (themeCookie) {
		return sanitizeThemeValue(themeCookie)
	}

	return null
}

export const getLlamaAIBooleanCookie = (cookieName: LlamaAICookieName): boolean => {
	if (typeof document === 'undefined') return false
	return getCookieValue(document.cookie, cookieName) === 'true'
}

export const createAnnouncementDismissalToken = (announcementId: string, version: string): string => {
	const normalizedAnnouncementId = sanitizeAnnouncementTokenPart(announcementId, 'announcement')
	const normalizedVersion = sanitizeAnnouncementTokenPart(version, 'v1')
	return `${normalizedAnnouncementId}--${normalizedVersion}`
}

export const parseDismissedAnnouncementsCookie = (
	cookieString: string,
	cookieName: string = ANNOUNCEMENT_DISMISSALS_COOKIE_NAME
): string[] => {
	const cookieValue = getCookieValue(cookieString, cookieName)
	if (!cookieValue) return []

	try {
		return normalizeAnnouncementTokens(decodeURIComponent(cookieValue).split(','))
	} catch {
		return normalizeAnnouncementTokens(cookieValue.split(','))
	}
}

export const getDismissedAnnouncements = (): string[] => {
	if (typeof document === 'undefined') return []

	return parseDismissedAnnouncementsCookie(document.cookie)
}

export const isAnnouncementDismissed = (token: string): boolean => {
	return getDismissedAnnouncements().includes(token)
}

export const dismissAnnouncement = (token: string): void => {
	if (typeof document === 'undefined' || !VALID_ANNOUNCEMENT_TOKEN_REGEX.test(token)) return

	const nextTokens = normalizeAnnouncementTokens([token, ...getDismissedAnnouncements()])
	const expires = new Date()
	expires.setFullYear(expires.getFullYear() + 1)

	const secureFlag = isSecureContext() ? '; Secure' : ''
	const cookieString = `${ANNOUNCEMENT_DISMISSALS_COOKIE_NAME}=${encodeURIComponent(nextTokens.join(','))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secureFlag}`
	document.cookie = cookieString
	syncAnnouncementDismissalStyles(nextTokens)
}

export const setLlamaAICookie = (cookieName: LlamaAICookieName, value: boolean): void => {
	if (typeof document === 'undefined') return

	const expires = new Date()
	expires.setFullYear(expires.getFullYear() + 1)

	const secureFlag = isSecureContext() ? '; Secure' : ''
	const cookieString = `${cookieName}=${value ? 'true' : 'false'}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secureFlag}`

	document.cookie = cookieString
}

export const syncLlamaAIChromeAttributes = (fullscreen: boolean, sidebarHidden: boolean): void => {
	if (typeof window === 'undefined') return

	syncLlamaAIChromeAttributesForPath(window.location.pathname, fullscreen, sidebarHidden)
}

export const parseThemeCookie = (cookieString: string, cookieName: string = THEME_COOKIE_NAME): Theme => {
	const themeCookie = getCookieValue(cookieString, cookieName)

	if (themeCookie) {
		return sanitizeThemeValue(themeCookie)
	}

	return 'dark'
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
