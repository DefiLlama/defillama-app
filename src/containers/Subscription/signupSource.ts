const STORAGE_KEY = 'signup_source'
const DEFAULT_SOURCE = 'subscription-page'

export function setSignupSource(source: string) {
	try {
		sessionStorage.setItem(STORAGE_KEY, source)
	} catch {
		// ignore storage errors
	}
}

export function getSignupSource(): string {
	try {
		return sessionStorage.getItem(STORAGE_KEY) ?? DEFAULT_SOURCE
	} catch {
		return DEFAULT_SOURCE
	}
}

export function clearSignupSource() {
	try {
		sessionStorage.removeItem(STORAGE_KEY)
	} catch {
		// ignore storage errors
	}
}
