import { readSingleQueryValue, safeInternalPath } from './routerQuery'

const GOOGLE_SHEETS_SCRIPT_ID = '1QqeBzdso-_WVCAamI1F0uKUhzYGFX9KbG8ufLVJ2AKupWAblK9agpcl4'

export const EXCEL_SHEETS_AUTH_ORIGIN = 'https://excel.llama.fi'

export function resolveSheetsAuthRedirect(rawRedirectUri: string | string[] | undefined): string | undefined {
	const redirectUri = readSingleQueryValue(rawRedirectUri)
	const internalPath = safeInternalPath(redirectUri)
	if (internalPath) return internalPath

	if (!redirectUri) return undefined

	try {
		const url = new URL(redirectUri)
		if (
			url.origin === 'https://script.google.com' &&
			(url.pathname === `/macros/d/${GOOGLE_SHEETS_SCRIPT_ID}/usercallback` ||
				url.pathname === `/macros/d/${GOOGLE_SHEETS_SCRIPT_ID}/usercallback/`) &&
			url.search === '' &&
			url.hash === ''
		) {
			return url.href
		}
	} catch {}

	return undefined
}
