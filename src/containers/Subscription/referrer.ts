const REFERER_KEY = 'signup_referrer'

export function setReferrer(value: string) {
	if (!value) return
	try {
		localStorage.setItem(REFERER_KEY, value)
	} catch {}
}

export function getReferrer(): string | null {
	try {
		return localStorage.getItem(REFERER_KEY)
	} catch {
		return null
	}
}
